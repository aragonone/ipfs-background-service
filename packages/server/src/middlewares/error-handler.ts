import { Middleware } from 'koa'
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, BAD_REQUEST } from 'http-status-codes'
import { MulterError } from 'multer'

const errors: Middleware = async (ctx, next) => {

  // wait on all middlewares
  try {
    await next()
    // throw Not found error for the handler
    if (ctx.status == NOT_FOUND) {
      ctx.throw(NOT_FOUND, { errors: [ { request: 'Not found' } ] })
    }
  }

  // handle all the errors
  catch (err) {
    // don't overwrite existing request
    if (ctx.headerSent) {
      return
    }
    // these are errors thrown using ctx.throw(STATUS, { errors: [ { type: message } ] })
    else if (err.status && err.status !== OK) {
      ctx.status = err.status
      ctx.body = err.errors ? { errors: err.errors } : err.message
    }
    // Multer file upload too large
    else if (err instanceof MulterError && err.message == 'File too large') {
      ctx.status = BAD_REQUEST
      ctx.body = { errors: [ { file: err.message } ] }
    }
    // for unexpected internal errors show the stack
    else {
      ctx.status = INTERNAL_SERVER_ERROR
      ctx.body = "Internal Server Error"
      console.error(err.stack)
    }
    console.error(JSON.stringify(ctx.body))
  }
}

export default errors
