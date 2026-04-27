import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/guards/jwt.guard.js';
import type { User } from '../../generated/prisma/index.js';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Omit<User, 'passwordHash'>> {
    const found = await this.usersService.findById(user.userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safe } = found;
    return safe;
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safe } = updated;
    return safe;
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.usersService.search(
      q ?? '',
      limit ? parseInt(limit, 10) : 20,
    );
    return users.map(({ passwordHash: _pw, ...safe }) => safe);
  }
}
