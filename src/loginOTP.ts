import createUUID from './createUUID';

Cypress.Commands.add(
  'loginOTP',
  ({
    root,
    realm,
    username,
    password,
    client_id,
    redirect_uri,
    path_prefix = 'auth',
    otp_secret,
    otp_credential_id = null,
    kc_idp_hint,
    scope = 'openid',
  }) =>
    cy
      .request({
        url: `${root}/${path_prefix}/realms/${realm}/protocol/openid-connect/auth`,
        qs: {
          client_id,
          redirect_uri,
          kc_idp_hint,
          scope,
          state: createUUID(),
          nonce: createUUID(),
          response_type: 'code',
          response_mode: 'fragment',
        },
      })
      .then((loginResponse) => {
        const html = document.createElement('html');
        html.innerHTML = loginResponse.body;

        const form = html.getElementsByTagName('form');
        const isAuthorized = !form.length;

        if (!isAuthorized) {
          return cy
            .request({
              form: true,
              method: 'POST',
              url: form[0].action,
              followRedirect: false,
              body: {
                username,
                password,
              },
            })
            .then((otpResponse) => {
              const html = document.createElement('html');
              html.innerHTML = otpResponse.body;

              const form = html.getElementsByTagName('form');

              cy.task<string>('generateOTP', otp_secret, { log: false }).then(
                (otp) => {
                  const body: Record<string, string> = { otp };

                  if (otp_credential_id) {
                    body.selectedCredentialId = otp_credential_id;
                  }

                  cy.request({
                    form: true,
                    method: 'POST',
                    url: form[0].action,
                    followRedirect: false,
                    body,
                  });
                }
              );
            });
        }
      })
);
