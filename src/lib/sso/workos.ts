/** WorkOS SSO stub — wire when WORKOS_API_KEY + WORKOS_CLIENT_ID are set. */

export type SsoProfile = {
  email: string;
  firstName?: string;
  lastName?: string;
  workosId: string;
};

export interface SsoProvider {
  getAuthorizationUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string): Promise<SsoProfile>;
}

export class MockSsoProvider implements SsoProvider {
  getAuthorizationUrl(redirectUri: string, state: string) {
    const url = new URL(redirectUri);
    url.searchParams.set("code", "mock_sso_code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCode(_code: string): Promise<SsoProfile> {
    return {
      email: "sso-demo@enterprise.example",
      firstName: "SSO",
      lastName: "Demo",
      workosId: "mock_workos_user",
    };
  }
}

export class WorkOsSsoProvider implements SsoProvider {
  constructor(
    private apiKey: string,
    private clientId: string,
  ) {}

  getAuthorizationUrl(redirectUri: string, state: string) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    return `https://api.workos.com/sso/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<SsoProfile> {
    const res = await fetch("https://api.workos.com/sso/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.apiKey,
        grant_type: "authorization_code",
        code,
      }),
    });
    if (!res.ok) throw new Error("WORKOS_TOKEN_FAILED");
    const data = (await res.json()) as {
      profile: { id: string; email: string; first_name?: string; last_name?: string };
    };
    return {
      email: data.profile.email,
      firstName: data.profile.first_name,
      lastName: data.profile.last_name,
      workosId: data.profile.id,
    };
  }
}

export function getSsoProvider(): SsoProvider {
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (apiKey && clientId && process.env.SSO_ENABLED === "true") {
    return new WorkOsSsoProvider(apiKey, clientId);
  }
  return new MockSsoProvider();
}
