module Pd::Application
  class FacilitatorApplication1819Mailer < ActionMailer::Base
    default from: 'Code.org <facilitators@code.org>'

    def confirmation(facilitator_application)
      raise "Unexpected #{facilitator_application.class}" unless facilitator_application.is_a? FacilitatorApplication1819

      @application = facilitator_application
      @signed = facilitator_application.csf? ? 'Jenna Garcia' : 'Sarah Fairweather'

      mail(
        to: @application.user.email,
        subject: 'We’ve received your facilitator application!'
      )
    end
  end
end
