class Pd::RegionalPartnerContactMailer < ActionMailer::Base
  default from: 'Tanya Parker <tanya_parker@code.org>'

  def matched(form, rp_pm)
    @form = form
    role = form[:role].downcase

    pm_id = rp_pm.program_manager_id
    pm = User.find(pm_id)
    @name = pm.name

    mail(
      to: pm.email,
      subject: "A " + role + " would like to connect with you"
    )
  end

  def unmatched(form, matched_but_no_pms)
    @form = form
    @matched_but_no_pms = matched_but_no_pms
    role = form[:role].downcase

    mail(
      to: 'Partners <partner@code.org>',
      subject: "A " + role + " wants to connect with Code.org"
    )
  end

  def receipt(form)
    @form = form

    interest = "professional learning program"
    unless form[:role] == "Teacher"
      interest = "administrator support"
    end
    @interest = interest

    mail(
      to: form[:email],
      subject: "Thank you for contacting us"
    )
  end
end
