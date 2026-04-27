import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  error: string;
  message: string;
  fields?: { field: string; message: string }[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error: string;
    let message: string;
    let fields: ErrorResponse['fields'];

    if (typeof exceptionResponse === 'string') {
      error = HttpStatus[status] ?? 'ERROR';
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const r = exceptionResponse as Record<string, unknown>;
      error =
        typeof r['error'] === 'string'
          ? r['error']
          : (HttpStatus[status] ?? 'ERROR');
      if (Array.isArray(r['message'])) {
        message = 'Validation failed';
        fields = (r['message'] as string[]).map((msg) => {
          const parts = msg.split(' ');
          return { field: parts[0] ?? 'unknown', message: msg };
        });
      } else {
        message =
          typeof r['message'] === 'string' ? r['message'] : exception.message;
      }
    } else {
      error = HttpStatus[status] ?? 'ERROR';
      message = exception.message;
    }

    const body: ErrorResponse = { error, message };
    if (fields) body.fields = fields;

    response.status(status).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
