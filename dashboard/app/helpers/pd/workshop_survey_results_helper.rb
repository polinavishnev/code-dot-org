module Pd::WorkshopSurveyResultsHelper
  LOCAL_WORKSHOP_MULTIPLE_CHOICE_FIELDS_IN_SUMMARY = [
    :how_much_learned,
    :how_motivating,
    :how_clearly_presented,
    :how_interesting,
    :how_often_given_feedback,
    :how_comfortable_asking_questions,
    :how_often_taught_new_things,
    :help_quality,
    :how_much_participated,
    :how_often_talk_about_ideas_outside,
    :how_often_lost_track_of_time,
    :how_excited_before,
    :overall_how_interested,
    :more_prepared_than_before,
    :know_where_to_go_for_help,
    :suitable_for_my_experience,
    :would_recommend,
    :part_of_community,
    :confident_can_teach,
    :anticipate_continuing,
    :received_clear_communication,
    :believe_all_students
  ]

  FREE_RESPONSE_FIELDS_IN_SUMMARY = [
    :venue_feedback,
    :things_you_liked,
    :things_you_would_change,
    :things_facilitator_did_well,
    :things_facilitator_could_improve,
    :who_facilitated
  ]

  LOCAL_WORKSHOP_FIELDS_IN_SUMMARY = (LOCAL_WORKSHOP_MULTIPLE_CHOICE_FIELDS_IN_SUMMARY + FREE_RESPONSE_FIELDS_IN_SUMMARY).freeze
  TEACHERCON_MULTIPLE_CHOICE_FIELDS = (Pd::TeacherconSurvey.public_required_fields & Pd::TeacherconSurvey.options.keys).freeze
  TEACHERCON_FIELDS_IN_SUMMARY = (Pd::TeacherconSurvey.public_fields).freeze

  # The output is a hash where
  # - Multiple choice answers (aka scored answers) that are not facilitator specific turn
  #   into an average of all responses
  # - Free responses that are not facilitator specific turn into an array of all responses
  # - Multiple choice answers that are facilitator specific turn into:
  #   A hash of facilitators and the average of their scores if no facilitator specified
  #   OR The average of all responses for one facilitator if facilitator specified
  # - Free response answers that are facilitator specific turn into:
  #   A hash of facilitators and a list of all their answers
  #   OR A list of all responses for one facilitator if facilitator specified
  #
  # @param workshops List of Workshops to aggregate surveys
  # @param facilitator_name_filter Facilitator name to restrict responses for
  # @param facilitator_breakdown Whether to have a facilitator breakdown
  # @returns Hash representing an average of all the respones, or array of free text responses
  def summarize_workshop_surveys(workshops:, facilitator_name_filter: nil, facilitator_breakdown: true, include_free_response: true)
    # Works on arrays where everything is either a teachercon survey or workshop survey
    # (but not both)
    surveys = workshops.flat_map(&:survey_responses)

    raise 'Currently just summarizes Local Summer and Teachercon surveys' unless
      surveys.all? {|survey| survey.is_a? Pd::TeacherconSurvey} ||
        surveys.all? {|survey| survey.is_a? Pd::LocalSummerWorkshopSurvey}

    return Hash.new if surveys.empty?

    questions = surveys.first.class.options
    facilitator_specific_options = surveys.first.class.facilitator_required_fields

    # Hash representing overall score sums
    sum_hash = Hash.new(0)
    responses_per_facilitator = Hash.new(0)

    fields_to_summarize =
      if surveys.first.is_a? Pd::LocalSummerWorkshopSurvey
        include_free_response ? LOCAL_WORKSHOP_FIELDS_IN_SUMMARY : LOCAL_WORKSHOP_MULTIPLE_CHOICE_FIELDS_IN_SUMMARY
      else
        include_free_response ? TEACHERCON_FIELDS_IN_SUMMARY : TEACHERCON_MULTIPLE_CHOICE_FIELDS
      end

    # Ugly branchy way to compute the summarization for the user
    surveys.each do |response|
      response_hash = facilitator_name_filter ?
                        response.generate_summary_for_facilitator(facilitator_name_filter) :
                        response.public_sanitized_form_data_hash

      response_hash[:who_facilitated].each {|name| responses_per_facilitator[name] += 1}

      response_hash.each do |k, v|
        next unless fields_to_summarize.include? k
        # Multiple choice questions
        if questions.key? k
          if v.is_a? Hash
            if facilitator_breakdown
              # Multiple choice answers for each facilitator
              sum_hash[k] = Hash.new(0) if sum_hash[k] == 0

              v.each do |name, answer|
                sum_hash[k][name] += questions[k].index(answer) + 1
              end
            else
              sum_hash[k] += v.values.map {|value| questions[k].index(value) + 1}.reduce(:+)
            end
          else
            next unless v.presence && questions[k].include?(v)

            # Multiple choice answer for the workshop as a whole
            sum_hash[k] += questions[k].index(v) + 1
          end
        else
          # The answer is a free response - either specific to the faciliator or in general
          if v.is_a? Hash
            # Hash, indicating facilitator specific free responses
            sum_hash[k] = Hash.new if sum_hash[k] == 0

            v.each do |name, answer|
              if sum_hash[k].key? name
                sum_hash[k][name] << answer
              else
                sum_hash[k][name] = [answer]
              end
            end
          else
            # Free response answers for the workshop as a whole
            sum_hash[k] = [] if sum_hash[k] == 0

            sum_hash[k] << v if v.presence
          end
        end
      end
    end

    sum_hash.each do |k, v|
      next unless questions.key? k

      if v.is_a? Integer
        sum_hash[k] =
          if facilitator_specific_options.include?(k)
            if facilitator_name_filter
              # For facilitator specific questions, take the average over all responses for that facilitator
              (v / responses_per_facilitator[facilitator_name_filter].to_f).round(2)
            else
              (v / responses_per_facilitator.values.reduce(:+).to_f).round(2)
            end
          else
            # For non facilitator specific answers, take the average over all surveys
            (v / surveys.count.to_f).round(2)
          end
      else
        v.each do |name, value|
          sum_hash[k][name] = (value / responses_per_facilitator[name].to_f).round(2)
        end
      end
    end

    sum_hash[:num_enrollments] = workshops.flat_map(&:enrollments).size
    sum_hash[:num_surveys] = surveys.size

    sum_hash.default = nil

    sum_hash
  end

  def generate_workshop_daily_session_summary(workshop)
    # TODO: (mehal) - Logic to only allow this for selected summer workshops
    summary = {
      this_workshop: {},
    }
    summary['questions'] = get_questions_for_forms

    summary[:this_workshop] = generate_workshops_survey_summary(workshop)

    summary[:facilitators] = Hash[*workshop.facilitators.pluck(:id, :name).flatten]

    summary
  end

  def generate_workshops_survey_summary(workshop)
    surveys = get_surveys_for_workshops(workshop)

    surveys['Pre Workshop'] = get_pre_workshop_surveys(workshop)
    surveys['Post Workshop'] = get_post_workshop_surveys(workshop)

    workshop_summary = {}

    get_questions_for_forms.each do |session, response_sections|
      surveys_for_session = surveys[session]
      session_summary = {
        survey_count: surveys_for_session.size,
      }

      response_sections.each do |response_section, questions|
        session_summary[response_section] = {}
        questions.each do |q_key, question|
          if question[:free_response]
            if response_section == :facilitator
              # For facilitator specific free responses, we want a hash of facilitator IDs
              # to an array of all of their specific responses
              facilitator_responses = Hash.new []

              surveys_for_session.each do |survey|
                survey[:facilitator][q_key].each do |facilitator, answer|
                  facilitator_responses[facilitator] += [answer]
                end
              end

              session_summary[:facilitator][q_key] = facilitator_responses
            else
              # Otherwise, we just want a list of all responses
              sum = surveys_for_session.map {|survey| survey[response_section][q_key]}.reduce([], :append)
              session_summary[response_section][q_key] = sum
            end
          else
            if response_section == :facilitator
              # For facilitator specific responses, keep track of both a sum total of all
              # responses, and the number of responses for that facilitator. Then divide
              # sum by responses to get the average for that facilitator.
              facilitator_response_sums = {}

              surveys_for_session.each do |survey|
                survey[:facilitator][q_key].each do |facilitator, answer|
                  if facilitator_response_sums[facilitator].nil?
                    facilitator_response_sums[facilitator] = {responses: 0, sum: 0}
                  end
                  facilitator_response_sums[facilitator][:responses] += 1
                  facilitator_response_sums[facilitator][:sum] += answer
                end
              end

              facilitator_response_averages = {}

              facilitator_response_sums.each do |facilitator_id, response_sums|
                facilitator_response_averages[facilitator_id] = (response_sums[:sum] / response_sums[:responses].to_f).round(2)
              end
              session_summary[:facilitator][q_key] = facilitator_response_averages
            else
              # For non facilitator specific responses, just return the average
              sum = surveys_for_session.map {|survey| survey[response_section][q_key]}.reduce(0, :+)
              session_summary[response_section][q_key] = (sum / surveys_for_session.size.to_f).round(2)
            end
          end
        end
      end

      workshop_summary[session] = session_summary
    end

    workshop_summary
  end

  # Below functions generate fake data.
  def get_pre_workshop_surveys(workshop)
    rand(10..20).times.map do |_|
      {
        general: {
          how_excited: rand(3..5),
          lunch_aspirations: %w(Tacos Burritos Pizza Sandwiches).sample
        }
      }
    end
  end

  def get_surveys_for_workshops(workshop)
    {
      'Day 1' => rand(10..20).times.map do |_|
        {
          general: {
            how_was_intro: rand(3..5),
            bakers_speech_feedback: %w(Cool Awesome Funny Weird).sample
          },
          facilitator: {
            rate_your_facilitator: {
              500 => rand(1..5),
              501 => rand(4..5)
            },
            describe_your_facilitator: {
              500 => %w(Helpful Effective Smart Funny Engaging Boring).sample,
              501 => %w(Amazing Super Brilliant Perfect).sample
            }
          }
        }
      end,
      'Day 2' => rand(10..20).times.map do |_|
        {
          general: {
            how_was_day_2_activity: rand(3..5),
            how_was_day_2_food: rand(2..5),
            cats_or_dogs: %w(Cats Cats! Dogs Puppies! Lizards).sample
          }
        }
      end,
      'Day 3' => rand(10..20).times.map do |_|
        {
          general: {
            how_was_day_3_activity: rand(3..5),
            how_were_animals: rand(4..5),
            favorite_sport: %w(Football Baseball Basketball Soccer Hockey Judo).sample
          }
        }
      end,
      'Day 4' => rand(10..20).times.map do |_|
        {
          general: {
            how_was_day_4_activity: rand(3..5),
            how_was_meeting_lebron: rand(1..5),
            favorite_tv_show: %w(Westworld Brooklyn\ 99 West\ Wing The\ Wire Breaking\ Bad).sample
          }
        }
      end,
      'Day 5' => rand(10..20).times.map do |_|
        {
          general: {
            how_was_day_5_activity: rand(4..5),
            how_was_meeting_andy_sandberg: rand(4..5),
            how_got_home: %w(Walk Rideshare Bus Car Train).sample,
            how_do_you_feel: %w(Good Great Awesome Amazing Excellent Fantabulous).sample
          }
        }
      end,
    }
  end

  def get_post_workshop_surveys(workshops)
    rand(10..20).times.map do |_|
      {
        general: {
          overall: rand(4..5),
          how_prepared: rand(4..5),
          any_feedback: %W(It\ was\ great! I'm\ psyched! More\ cats\ next\ time).sample,
          last_words: %W(Hasta\ la\ vista Peace Sayonara Nope).sample
        }
      }
    end
  end

  def get_questions_for_forms
    {
      'Pre Workshop' => {
        general: {
          how_excited: {text: 'How excited are you?'},
          lunch_aspirations: {text: 'What do you hope lunch will be?', free_response: true}
        }
      },
      'Day 1' => {
        general: {
          how_was_intro: {text: 'How was the course introduction?'},
          bakers_speech_feedback: {text: 'What did you think of Baker?', free_response: true}
        },
        facilitator: {
          rate_your_facilitator: {text: 'How was your facilitator?'},
          describe_your_facilitator: {text: 'What words best describe your facilitator?', free_response: true}
        }
      },
      'Day 2' => {
        general: {
          how_was_day_2_activity: {text: 'How were the day 2 activities?'},
          how_was_day_2_food: {text: 'How was the food on day 2?'},
          cats_or_dogs: {text: 'Do you like cats or dogs?', free_response: true}
        }
      },
      'Day 3' => {
        general: {
          how_was_day_3_activity: {text: 'How were the day 3 activities?'},
          how_were_animals: {text: 'How successful was the animal-based activity?'},
          favorite_sport: {text: 'What is your favorite sport?', free_response: true}
        }
      },
      'Day 4' => {
        general: {
          how_was_day_4_activity: {text: 'How were the day 4 activities?'},
          how_was_meeting_lebron: {text: 'Did you enjoy meeting LeBron?'},
          favorite_tv_show: {text: 'What is your favorite TV show?', free_response: true}
        }
      },
      'Day 5' => {
        general: {
          how_was_day_5_activity: {text: 'How was the day 5 activity?'},
          how_was_meeting_andy_sandberg: {text: 'How awesome was meeting Andy Sandberg?'},
          how_got_home: {text: 'How did you get home?', free_response: true},
          how_do_you_feel: {text: 'How do you really feel?', free_response: true}
        }
      },
      'Post Workshop' => {
        general: {
          overall: {text: 'Overall, how successful was the workshop?'},
          how_prepared: {text: 'How prepared do you feel for the coming year?'},
          any_feedback: {text: 'Any feedback?', free_response: true},
          last_words: {text: 'Any last words?', free_response: true}
        }
      }
    }
  end
end
