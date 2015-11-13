require 'test_helper'

class AdminReportsControllerTest < ActionController::TestCase
  include Devise::TestHelpers

  setup do
    @admin = create(:admin)
    sign_in(@admin)

    @not_admin = create(:user, username: 'notadmin')

    @script = create(:script, name: 'Report Script')
    @stage = create(:stage, script: @script, name: 'Report Stage 1')
    @stage2 = create(:stage, script: @script, name: 'Report Stage 2')
    @script_level = create(:script_level, script: @script, stage: @stage)
    @script_level2 = create(:script_level, script: @script, stage: @stage2)
    @script_level.move_to_bottom
    @script_level2.move_to_bottom

    @teacher = create(:teacher)
    @teacher_section = create(:section, :user => @teacher)

    @student = create(:user)
    @follower = Follower.create(:section => @teacher_section, :user => @teacher, :student_user => @student)
  end

  generate_admin_only_tests_for :all_usage
  generate_admin_only_tests_for :admin_concepts
  generate_admin_only_tests_for :admin_progress
  generate_admin_only_tests_for :admin_stats
  generate_admin_only_tests_for :funometer
  # TODO(asher): Uncomment these after fixing the associated route problem.
  # generate_admin_only_tests_for :funometer_by_script, {script: 1}
  # generate_admin_only_tests_for :funometer_by_script_level, {script: 1, level: 2}

  test 'should get admin progress page' do
    get :admin_progress
    assert_select 'h1', 'Admin progress'
  end

end
