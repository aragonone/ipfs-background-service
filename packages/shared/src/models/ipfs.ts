import ipfsClient, { globSource } from 'ipfs-http-client'

const { IPFS_API_URL } = process.env

interface CID {
  multibaseName: string
  toString(): string
}

interface ipfs {
  add(globSource: any): Promise<{cid: CID}>,
  pin: {
    rm(cid: string): Promise<void>,
    ls(options: {paths: CID | CID[] | string | string[]}): AsyncIterable<{ cid: CID, type: string }>	
  },
  repo: {
    gc(): AsyncIterable<any>	
  }
}

class Ipfs {
  ipfs!: ipfs
  
  constructor(apiUrl: string) {
    this.setClient(apiUrl)
  }

  setClient(apiUrl: string): void {
    this.ipfs = ipfsClient(apiUrl)
  }

  async add(content: string | Buffer): Promise<string> {
    const file = await this.ipfs.add(typeof content == 'string' ? globSource(content) : content)
    return file.cid.toString()
  }

  async del(cid: string): Promise<boolean> {
    let deleted: boolean
    try {
      await this.ipfs.pin.rm(cid)
      deleted = true
    }
    catch (err) {
      if (err.message != `not pinned or pinned indirectly`) {
        throw err
      }
      deleted = false
    }
    return deleted
  }

  async exists(cid: string): Promise<boolean> {
    let exists: boolean
    try {
      for await (const _ of this.ipfs.pin.ls({paths: cid})) { _ }
      exists = true
    }
    catch (err) {
      if (err.message != `path '${cid}' is not pinned`) {
        throw err
      }
      exists = false
    }
    return exists
  }

  async gc(): Promise<void> {
    for await (const _ of this.ipfs.repo.gc()) { _ }
  }
}

export default new Ipfs(IPFS_API_URL as string)
