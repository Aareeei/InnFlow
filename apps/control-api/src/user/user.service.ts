import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { AuthenticationError } from '@innflow/domain';

@Injectable()
export class UserService {
  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  }

  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
  }

  async requireById(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  }
}
