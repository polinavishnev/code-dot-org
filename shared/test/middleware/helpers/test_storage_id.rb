require_relative '../../test_helper'
require_relative '../../../middleware/helpers/storage_id'

class StorageIdTest < Minitest::Test
  def setup
    @user_storage_ids_table = PEGASUS_DB[:user_storage_ids]
  end

  def test_storage_id_for_current_user
    request = mock
    stubs(:request).returns(request)

    # Returns nil if no user
    request.stubs(:user_id).returns(nil)
    assert_nil storage_id_for_current_user

    # Gets value from table if it exists
    request.stubs(:user_id).returns(2)
    table_storage_id = @user_storage_ids_table.insert(user_id: 2)
    assert_equal table_storage_id, storage_id_for_current_user

    # Returns value from cookie if we have one
    request.stubs(:user_id).returns(3)
    stubs(:take_storage_id_ownership_from_cookie).returns(123)
    assert_equal 123, storage_id_for_current_user

    # adds entry to table if no cookie
    request.stubs(:user_id).returns(4)
    stubs(:take_storage_id_ownership_from_cookie).returns(nil)
    storage_id = storage_id_for_current_user

    row = @user_storage_ids_table.where(user_id: 4).first
    assert_equal row[:id], storage_id
  end

  def test_take_storage_id_ownership_from_cookie
    response = mock
    response.stubs(:delete_cookie).returns(nil)
    stubs(:response).returns response

    # does nothing if no cookie
    user_id = 6
    stubs(:storage_id_from_cookie).returns(nil)
    assert_nil take_storage_id_ownership_from_cookie(user_id)

    # takes ownership if id is unused
    user_id = 7
    # this row would get created as part of create_storage_id_cookie
    table_storage_id = @user_storage_ids_table.insert(user_id: nil, id: 123)
    stubs(:storage_id_from_cookie).returns(table_storage_id)
    response.expects(:delete_cookie)
    storage_id = take_storage_id_ownership_from_cookie(user_id)
    assert_equal table_storage_id, storage_id
    row = @user_storage_ids_table.where(user_id: user_id).first
    assert_equal row[:id], table_storage_id

    # returns nil if owned by a different user
    other_user_id = 8
    user_id = 9
    table_storage_id = @user_storage_ids_table.insert(user_id: other_user_id)
    stubs(:storage_id_from_cookie).returns(table_storage_id)
    response.expects(:delete_cookie)
    storage_id = take_storage_id_ownership_from_cookie(user_id)
    assert_nil storage_id
    assert_nil @user_storage_ids_table.where(user_id: user_id).first
  end
end
