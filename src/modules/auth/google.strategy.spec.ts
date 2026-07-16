import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy';

const buildConfigService = (): ConfigService =>
  ({
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'google.clientId': 'client-id',
        'google.clientSecret': 'client-secret',
        'google.callbackUrl':
          'http://localhost:3000/api/v1/auth/google/callback',
      };
      return values[key];
    }),
  }) as unknown as ConfigService;

describe('GoogleStrategy.validate', () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = new GoogleStrategy(buildConfigService());
  });

  it('maps a full Google profile to the normalized GoogleProfile shape', () => {
    const profile = {
      id: 'google-sub-1',
      displayName: 'Ada Lovelace',
      name: { familyName: 'Lovelace', givenName: 'Ada' },
      emails: [{ value: 'ada@example.com', verified: true }],
      photos: [{ value: 'https://example.com/pic.jpg' }],
      provider: 'google',
    } as unknown as Profile;

    const result = strategy.validate('access-token', 'refresh-token', profile);

    expect(result).toEqual({
      googleId: 'google-sub-1',
      email: 'ada@example.com',
      emailVerified: true,
      firstName: 'Ada',
      lastName: 'Lovelace',
      picture: 'https://example.com/pic.jpg',
    });
  });

  it('falls back to safe defaults when optional profile fields are missing', () => {
    const profile = {
      id: 'google-sub-2',
      displayName: 'No Extras',
      provider: 'google',
    } as unknown as Profile;

    const result = strategy.validate('access-token', 'refresh-token', profile);

    expect(result).toEqual({
      googleId: 'google-sub-2',
      email: '',
      emailVerified: false,
      firstName: null,
      lastName: null,
      picture: null,
    });
  });

  it('treats an unverified Google email as such', () => {
    const profile = {
      id: 'google-sub-3',
      emails: [{ value: 'unverified@example.com', verified: false }],
      provider: 'google',
    } as unknown as Profile;

    const result = strategy.validate('access-token', 'refresh-token', profile);

    expect(result.email).toBe('unverified@example.com');
    expect(result.emailVerified).toBe(false);
  });
});
