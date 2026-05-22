import { HttpException, HttpStatus } from '@nestjs/common';

export const AI_CHAT_ERROR = {
  SESSION_NOT_FOUND: 'AI_CHAT_SESSION_NOT_FOUND',
} as const;

export function throwAiChatError(
  code: string,
  message: string,
  status: HttpStatus = HttpStatus.NOT_FOUND,
): never {
  throw new HttpException({ code, message }, status);
}

export function throwForbiddenAccess(message: string): never {
  throw new HttpException(
    { code: 'FORBIDDEN_RESOURCE_ACCESS', message },
    HttpStatus.FORBIDDEN,
  );
}
