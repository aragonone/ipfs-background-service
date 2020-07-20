import { Middleware } from 'koa'
import multer from '@koa/multer'
import ipfsClient, { globSource } from 'ipfs-http-client'
import fs from 'fs'
import { promisify } from 'util'
import { BAD_REQUEST } from 'http-status-codes'

import { ObjectionModels } from '@aragonone/ipfs-background-service-shared'
import FilesValidator from '../helpers/files-validator'

const MEGABYTES = 10 ** 6
const upload = multer({
  limits: {
    fileSize: 10 * MEGABYTES
  },
  dest: '/uploads'
})
const { File } = ObjectionModels
const ipfs = ipfsClient(process.env.IPFS_API_URL)
const deleteTempFile = promisify(fs.unlink)

export default class FilesController {
  static upload: Middleware = upload.single('file')

  static create: Middleware = async (ctx) => {
    const { body: { owner }, file } = ctx.request
    let cid = ''
    try {
      await FilesValidator.validateForCreate(ctx)
      const ipfsFile = await ipfs.add(globSource(file.path))
      cid = ipfsFile.cid.toString()
      if (await File.exists({cid})) {
        ctx.throw(BAD_REQUEST, { errors: [ { file: `File is already uploaded with cid ${cid}`} ] })
      }
      await File.create({
        owner,
        cid,
        sizeBytes: file.size,
        originalName: file.originalname,
        encoding: file.encoding,
        mimeType: file.mimetype
      })
    }
    catch (err) {
      await deleteTempFile(file.path)
      throw err
    }
    await deleteTempFile(file.path)
    ctx.body = await File.findMeta({cid})
  }

  // delete endpoint to do later
  // static delete: Middleware = async (ctx) => {
  //   await FilesValidator.validateForDelete(ctx)
  //   ctx.body = {
  //     deleted: true
  //   }
  // }

  static findAll: Middleware = async (ctx) => {
    await FilesValidator.validateForFindAll(ctx)
    const { owner, page = 0, pageSize = 10 } = ctx.params
    let args = {}
    if (owner) args = {owner}
    ctx.body = await File.findMetaPage(page, pageSize, args)
  }

  static findOne: Middleware = async (ctx) => {
    await FilesValidator.validateForFindOne(ctx)
    const { cid } = ctx.params
    ctx.body = await File.findMeta({cid})
  }
}
