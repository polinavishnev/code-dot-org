module ActivityConstants
  # These values correspond to constants from
  # /blockly/src/constants.js and help describe the meaning of the
  # numeric score/result of a user attempting a blockly level. In
  # dashboard these are stored in Activity.result and
  # UserLevel.best_result (UserLevel is an aggregate of Activity)

  UNSUBMITTED_RESULT = -50

  MINIMUM_FINISHED_RESULT = 10
  MINIMUM_PASS_RESULT = 20
  MAXIMUM_NONOPTIMAL_RESULT = 29
  FREE_PLAY_RESULT = 30
  MANUAL_PASS_RESULT = 90
  BEST_PASS_RESULT = 100

  PASSING_VALUES = [
    MINIMUM_PASS_RESULT,
    MAXIMUM_NONOPTIMAL_RESULT,
    FREE_PLAY_RESULT,
    MANUAL_PASS_RESULT,
    BEST_PASS_RESULT
  ]

  UNREVIEWED_SUBMISSION_RESULT = 1000
  REVIEW_REJECTED_RESULT = 1500
  REVIEW_ACCEPTED_RESULT = 2000

  def self.best?(result)
    return false if result.nil?
    result == BEST_PASS_RESULT
  end

  def self.perfect?(result)
    return false if result.nil?
    result > MAXIMUM_NONOPTIMAL_RESULT
  end

  def self.passing?(result)
    return false if result.nil?
    result >= MINIMUM_PASS_RESULT
  end

  def self.finished?(result)
    return false if result.nil?
    result >= MINIMUM_FINISHED_RESULT
  end
end
