import knex, { type Knex } from 'knex'
import config from '../../knexfile'

export const db = knex(config)

// repository の関数はトランザクション(trx)の中でも使えるよう、接続を引数で受け取る
export type Conn = Knex | Knex.Transaction
