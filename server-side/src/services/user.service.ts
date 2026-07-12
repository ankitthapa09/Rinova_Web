import { userRepository } from '@/repositories/user.repository';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import type { UserDocument } from '@/models/user.model';

// Auth flows live in auth.service — this file is only what an operator does with accounts.
export const userService = {
  list(): Promise<UserDocument[]> {
    return userRepository.findAll();
  },

  async remove(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');

    // Admin accounts are managed only by the seed script — the UI
    // can never delete one
    if (user.role === 'admin') {
      throw AppError.forbidden('Admin accounts cannot be deleted');
    }

    await userRepository.deleteById(id);
    logger.info('user deleted by admin', { userId: id, email: user.email });
  },
};
