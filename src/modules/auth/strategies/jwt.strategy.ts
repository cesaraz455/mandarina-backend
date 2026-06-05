import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

/**
 * JWT strategy for access token validation.
 *
 * Architecture decision: The strategy validates the token signature and expiry,
 * then delegates user lookup to UsersService. Attaching the full payload (not
 * just userId) allows guards and decorators to access user data without an
 * extra DB round-trip on every authenticated request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    const user = await this.usersService.findById(payload.sub);

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    return payload;
  }
}
