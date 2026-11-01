import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from './permissions.decorator';
import { getAdminPermissions, Permission } from './permissions';
import { User, UserRole } from '../../../users/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const anyRequired = this.reflector.getAllAndOverride<Permission[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRequired = Boolean(required && required.length > 0);
    const hasAnyRequired = Boolean(anyRequired && anyRequired.length > 0);

    if (!hasRequired && !hasAnyRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Administrator access is required');
    }

    const granted = new Set(getAdminPermissions(user));

    if (hasRequired && required) {
      const missing = required.filter((permission) => !granted.has(permission));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Missing permission${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
        );
      }
    }

    if (hasAnyRequired && anyRequired) {
      const hasAny = anyRequired.some((permission) => granted.has(permission));
      if (!hasAny) {
        throw new ForbiddenException(
          `Requires at least one permission: ${anyRequired.join(', ')}`,
        );
      }
    }

    return true;
  }
}

