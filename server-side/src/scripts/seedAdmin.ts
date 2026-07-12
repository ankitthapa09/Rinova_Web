import { env } from '@/config/env';
import { connectDatabase, disconnectDatabase } from '@/config/db';
import { logger } from '@/config/logger';
import { User } from '@/models/user.model';


 
 // Run with:  npm run seed:admin
 
async function seedAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  // These two are optional in the env schema so the API can boot without them,
  // but the seed is meaningless without them — fail loudly.
  if (!email || !password) {
    logger.error('Cannot seed admin: set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  await connectDatabase();

  try {
    const existing = await User.findOne({ email }).select('+password').exec();

    if (existing) {
      // Reset the known fields so a re-run reliably fixes a forgotten password
      // or promotes an existing user to admin.
      existing.role = 'admin';
      existing.name = env.ADMIN_NAME;
      existing.phone = env.ADMIN_PHONE;
      existing.address = env.ADMIN_ADDRESS;
      existing.password = password; // pre-save hook re-hashes it
      await existing.save();
      logger.info(`Admin account updated: ${email}`);
    } else {
      await User.create({
        name: env.ADMIN_NAME,
        email,
        phone: env.ADMIN_PHONE,
        address: env.ADMIN_ADDRESS,
        password, // pre-save hook hashes it
        role: 'admin',
        isEmailVerified: true, // admin is trusted; skip the verification flow
      });
      logger.info(`Admin account created: ${email}`);
    }
  } finally {
    await disconnectDatabase();
  }
}

seedAdmin().catch((err) => {
  logger.error('Admin seed failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
