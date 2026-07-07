import { userRepository } from '@/repositories/user.repository';
import { tokenService, type TokenPair } from '@/services/token.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import type { UserDocument } from '@/models/user.model';
import type { RegisterInput, LoginInput } from '@/validators/auth.validator';

export interface AuthResult {
  user: UserDocument;
  tokens: TokenPair;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    if (await userRepository.existsByEmail(input.email)) {
      throw AppError.conflict('An account with this email already exists');
    }

    const user = await userRepository.create(input);
    logger.info('user registered', { userId: user.id });

    return {
      user,
      tokens: tokenService.signTokenPair({ sub: user.id, role: user.role }),
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    // Same error whether the email or the password is wrong — a different
    // message would let an attacker probe which emails are registered.
    if (!user || !(await user.comparePassword(input.password))) {
      logger.warn('failed login attempt', { email: input.email });
      throw AppError.unauthorized('Invalid email or password');
    }

    await userRepository.recordLogin(user.id);

    return {
      user,
      tokens: tokenService.signTokenPair({ sub: user.id, role: user.role }),
    };
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { sub } = tokenService.verifyRefreshToken(refreshToken);

    const user = await userRepository.findById(sub);
    if (!user) throw AppError.unauthorized('Account no longer exists');

    return tokenService.signTokenPair({ sub: user.id, role: user.role });
  },
};
