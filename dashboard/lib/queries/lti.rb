require 'policies/lti'
require 'authentication_option'

class Queries::Lti
  def self.get_user(id_token)
    auth_id = Policies::Lti.generate_auth_id(id_token)
    # TODO: update 'lti' as constant value in authentication_options
    User.find_by_credential(type: AuthenticationOption::LTI_V1, id: auth_id)
  end
end
