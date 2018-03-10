# == Schema Information
#
# Table name: census_summaries
#
#  id          :integer          not null, primary key
#  school_id   :string(12)       not null
#  school_year :integer          not null
#  teaches_cs  :string(2)
#  audit_data  :text(65535)      not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
# Indexes
#
#  index_census_summaries_on_school_id_and_school_year  (school_id,school_year) UNIQUE
#

class Census::CensusSummary < ApplicationRecord
  belongs_to :school
  validates_presence_of :school_id
  validates :school_year, presence: true, numericality: {greater_than_or_equal_to: 2015, less_than_or_equal_to: 2030}

  TEACHES = {
    YES: "Y",
    NO: "N",
    MAYBE: "M",
    HISTORICAL_YES: "HY",
    HISTORICAL_NO: "HN",
    HISTORICAL_MAYBE: "HM",
  }.freeze
  enum teaches_cs: TEACHES

  validates_presence_of :audit_data

  AUDIT_DATA_VERSIONS = {
    INITIAL_IMPLEMENTATION: 0.1,
    NAIVE_BAYES: 0.2,
    SIMPLE: 0.3,
    PRECEDENCE_V1: 1.1,
  }.freeze

  # High schools need to teach a 20 hour course with either
  # block- or text-based programming for it to count as CS.
  # Other schools can teach any 10 or 20 hour courses.
  # Schools that are a mix of K8 and high school use the K8 logic.
  # The teacher banner does not have the topic check boxes
  # so we count those submissions even though they don't have
  # those options checked.
  def self.submission_teaches_cs?(submission, is_high_school:, is_k8_school:)
    if is_high_school && !is_k8_school
      (
        (
          submission.how_many_20_hours_some? ||
          submission.how_many_20_hours_all?
        ) &&
        (
          submission.type == "Census::CensusTeacherBannerV1" ||
          submission.topic_text ||
          submission.topic_blocks
        )
      )
    else
      (
        submission.how_many_10_hours_some? ||
        submission.how_many_10_hours_all? ||
        submission.how_many_20_hours_some? ||
        submission.how_many_20_hours_all?
      )
    end
  end

  def self.submission_has_response(submission, is_high_school)
    # Treat an "I don't know" response the same as not having any response
    if is_high_school
      !(submission.how_many_20_hours.nil? || submission.how_many_20_hours_dont_know?)
    else
      !(submission.how_many_10_hours.nil? || submission.how_many_10_hours_dont_know?) ||
      !(submission.how_many_20_hours.nil? || submission.how_many_20_hours_dont_know?)
    end
  end

  HISTORICAL_RESULTS_MAP = {
    "YES" => "HISTORICAL_YES",
    "NO" => "HISTORICAL_NO",
    "MAYBE" => "HISTORICAL_MAYBE",
    "HISTORICAL_YES" => "HISTORICAL_YES",
    "HISTORICAL_NO" => "HISTORICAL_NO",
    "HISTORICAL_MAYBE" => "HISTORICAL_MAYBE",
  }

  def self.map_historical_teaches_cs(historical_value)
    HISTORICAL_RESULTS_MAP[historical_value]
  end

  def self.summarize_school_data(summarization_data)
    school = summarization_data[:school]
    school_years = summarization_data[:school_years]
    state_years_with_data = summarization_data[:state_years_with_data]

    summaries = []
    last_years_result = nil
    two_years_ago_result = nil

    school_years.each do |school_year|
      audit = {
        version: AUDIT_DATA_VERSIONS[:PRECEDENCE_V1],
        stats: {},
        census_submissions: [],
        ap_cs_offerings: [],
        ib_cs_offerings: [],
        state_cs_offerings: [],
      }

      # If the school doesn't have stats then treat it as not high school.
      # The lack of stats will show up in the audit data as a null value for high_school.
      # k8_school will behave similarly.
      stats = school.school_stats_by_year.try(:sort).try(:last)
      high_school = stats.try(:has_high_school_grades?)
      k8_school = stats.try(:has_k8_grades?)
      audit[:stats][:high_school] = high_school
      audit[:stats][:k8_school] = k8_school

      # Census Submissions
      submissions = school.school_info.map(&:census_submissions).flatten
      # Lack of a submission for a school isn't considered evidence
      # so we only look at actual submissions.
      counts = {
        teacher_or_admin: {
          yes: 0,
          no: 0,
        },
        not_teacher_or_admin: {
          yes: 0,
          no: 0,
        },
      }
      submissions.select {|s| s.school_year == school_year}.each do |submission|
        teaches =
          if submission_has_response(submission, high_school)
            submission_teaches_cs?(submission, is_high_school: high_school, is_k8_school: k8_school)
          else
            nil
          end

        is_teacher_or_admin = (submission.submitter_role_teacher? || submission.submitter_role_administrator?)
        teacher_or_admin = is_teacher_or_admin ? :teacher_or_admin : :not_teacher_or_admin

        audit[:census_submissions].push(
          {
            id: submission.id,
            teaches: teaches,
            teacher_or_admin: teacher_or_admin,
          }
        )

        next if teaches.nil?

        if teaches
          counts[teacher_or_admin][:yes] += 1
        else
          counts[teacher_or_admin][:no] += 1
        end
      end

      audit[:census_submissions].push({counts: counts})

      consistency = {
        teacher_or_admin: nil,
        not_teacher_or_admin: nil,
      }
      has_inconsistent_surveys = false

      [:teacher_or_admin, :not_teacher_or_admin].each do |role|
        unless counts[role][:no] == 0 && counts[role][:yes] == 0
          if counts[role][:no] == 0
            consistency[role] = "YES"
          elsif counts[role][:yes] == 0
            consistency[role] = "NO"
          else
            has_inconsistent_surveys = true
          end
        end
      end

      # AP data

      has_ap_data = false
      ap_offerings = school.ap_school_code.try(:ap_cs_offering) || []
      ap_offerings_this_year = ap_offerings.select {|o| o.school_year == school_year}
      ap_offerings_this_year.each do |offering|
        audit[:ap_cs_offerings].push(offering.id)
      end
      has_ap_data = true unless ap_offerings_this_year.empty?

      # IB data

      has_ib_data = false
      ib_offerings = school.ib_school_code.try(:ib_cs_offering) || []
      ib_offerings_this_year = ib_offerings.select {|o| o.school_year == school_year}
      ib_offerings_this_year.each do |offering|
        audit[:ib_cs_offerings].push(offering.id)
      end
      has_ib_data = true unless ib_offerings_this_year.empty?

      # State data

      # Schools without state school ids cannot have state data.
      # Ignore those schools so that we won't count the lack of
      # state data as a NO.
      state_data = nil
      if school.state_school_id
        state_offerings = school.state_cs_offering || []
        state_offerings = state_offerings.select {|o| o.school_year == school_year}
        # If we have any state data for this year then a high school
        # without a row is counted as a NO
        if high_school &&
           state_offerings.empty? &&
           Census::StateCsOffering::SUPPORTED_STATES.include?(school.state) &&
           state_years_with_data[school.state].include?(school_year)
          audit[:state_cs_offerings].push(nil)
          state_data = 'NO'
        else
          state_offerings.each do |offering|
            audit[:state_cs_offerings].push(offering.id)
          end
          state_data = 'YES' unless state_offerings.empty?
        end
      end

      summary = Census::CensusSummary.find_or_initialize_by(
        school: school,
        school_year: school_year,
      )

      #
      # We will set teaches_cs to the first value we find in this order:
      # 1	This year's AP data
      # 2	This year's IB data
      # 3	This year's surveys from teachers/administrators - consistent
      # 4	State data
      # 5	This year's surveys from non-teachers/admins - consistent
      # 6	This year's surveys - inconsistent
      # 7	teaches_cs from last year
      # 8	teaches_cs from 2 years ago
      # 9 nil
      #
      summary.teaches_cs =
        if has_ap_data || has_ib_data
          'YES'
        elsif consistency[:teacher_or_admin]
          consistency[:teacher_or_admin]
        elsif state_data
          state_data
        elsif consistency[:not_teacher_or_admin]
          consistency[:not_teacher_or_admin]
        elsif has_inconsistent_surveys
          'MAYBE'
        elsif last_years_result
          map_historical_teaches_cs(last_years_result)
        elsif two_years_ago_result
          map_historical_teaches_cs(two_years_ago_result)
        else
          nil
        end

      audit[:last_years_result] = last_years_result
      audit[:two_years_ago_result] = two_years_ago_result

      summary.audit_data = JSON.generate(audit)

      summaries.push summary

      two_years_ago_result = last_years_result
      last_years_result = summary.teaches_cs
    end

    return summaries
  end

  def self.summarize_census_data
    latest_survey_year = Census::CensusSubmission.maximum(:school_year)
    years_with_ap_data = Census::ApCsOffering.select(:school_year).group(:school_year).map(&:school_year)
    latest_ap_data_year = years_with_ap_data.max
    years_with_ib_data = Census::IbCsOffering.select(:school_year).group(:school_year).map(&:school_year)
    latest_ib_data_year = years_with_ib_data.max
    latest_data_year_by_state = {}
    state_years_with_data = {}
    Census::StateCsOffering::SUPPORTED_STATES.each do |state|
      state_years_with_data[state] = Census::StateCsOffering.
                                       joins(:school).
                                       where(schools: {state: state}).
                                       select(:school_year).
                                       group(:school_year).
                                       map(&:school_year)
      latest_data_year_by_state[state] = state_years_with_data[state].max
    end
    latest_state_data_year = latest_data_year_by_state.values.max

    latest_year = [
      latest_survey_year,
      latest_ap_data_year,
      latest_ib_data_year,
      latest_state_data_year,
    ].max
    school_years = (2016..latest_year)

    ActiveRecord::Base.transaction do
      School.eager_load(school_info: :census_submissions).
        eager_load(ap_school_code: :ap_cs_offering).
        eager_load(ib_school_code: :ib_cs_offering).
        eager_load(:state_cs_offering).
        eager_load(:school_stats_by_year).
        find_each do |school|

        summarize_school_data(
          {
            school: school,
            school_years: school_years,
            years_with_ap_data: years_with_ap_data,
            years_with_ib_data: years_with_ib_data,
            state_years_with_data: state_years_with_data,
          }
        ).each do |summary|
          if block_given?
            yield summary
          else
            summary.save!
          end
        end
      end
    end
  end
end
