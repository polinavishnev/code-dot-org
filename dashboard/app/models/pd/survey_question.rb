# == Schema Information
#
# Table name: pd_survey_questions
#
#  id         :integer          not null, primary key
#  form_id    :integer
#  questions  :text(65535)      not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_pd_survey_questions_on_form_id  (form_id) UNIQUE
#

module Pd
  class SurveyQuestion < ApplicationRecord
    def self.sync_from_jotform(form_id)
      questions = JotForm::Translation.new(form_id).get_questions
      serialized_questions = JotForm::FormQuestions.new(form_id, questions).serialize.to_json

      find_or_initialize_by(form_id: form_id).update!(
        questions: serialized_questions
      )
    end

    def form_questions
      @form_questions ||= JotForm::FormQuestions.deserialize(form_id, JSON.parse(questions))
    end

    delegate :summarize, to: :form_questions
    delegate :process_answers, to: :form_questions
    delegate :[], to: :form_questions
  end
end
