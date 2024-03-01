import pg from "pg";
import Case from 'case';

export default class SQLClient {
  constructor(connectionString) {
    this.client = new pg.Client({
      connectionString
    });

  }

  async connect() {
    await this.client.connect();
  }

  async query(...args) {
    return await this.client.query(...args);
  }

  async createTable(table, columnOptions) {
    const columns = Object.entries(columnOptions).map(([column, options]) => `
      ${column} ${options.type} ${options.primaryKey ? "PRIMARY KEY" : ""} ${options.references ? `REFERENCES ${options.references}` : ''} ${options.nullable ? '' : "NOT NULL"} ${options.default ? `DEFAULT ${options.default}` : ''}
    `).join(',\n');
    const sql = `
      CREATE TABLE ${table} (
        ${columns}
      );
    `

    await this.client.query(sql);
  }

  async dropTable(table) {
    const sql = `DROP TABLE IF EXISTS ${table}`;
    await this.client.query(sql);
  }

  async getAll(table, onError) {
    try {
      const { rows } = await this.client.query(`SELECT * FROM ${table};`);

      return rows;
    } catch (err) {
      onError(err);
    }
  }

  async getById (table, id, onError) {
    try {
      const sql = `
        SELECT * FROM ${table} WHERE id=$1;
      `;
      const { rows } = await this.client.query(sql, [id]);

      return rows[0];
    } catch (err) {
      onError(err);
    }
  }

  async create(table, body, onError) {
    try {
      const columns = Object.keys(body).map(Case.snake);
      const values = Object.values(body);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `
        INSERT INTO ${table}
        (${columns.join(", ")})
        VALUES
        (${placeholders})
        RETURNING *;
      `;
      const { rows } = await this.client.query(sql, values);

      return rows[0];
    } catch (err) {
      onError = onError || console.error;
      onError(err);
    }
  }

  async removeById (table, id, onError) {
    try {
      const sql = `
        DELETE FROM ${table}
        WHERE id = $1
      `;
      await this.client.query(sql, [id]);

      return true;
    } catch (err) {
      onError(err);
    }
  }

  async replaceById(table, id, body, onError) {
    try {
      const columns = Object.keys(body).map(Case.snake);
      const placeholders = columns.map((column, i) => `${column}=$${i + 1}`).join(', ');
      const values = Object.values(body);
      values.push(id);

      const sql = `
        UPDATE employees 
        SET ${placeholders}
        WHERE id=$${values.length}
        RETURNING *;
      `;
      const { rows } = await this.client.query(sql, values);

      return rows[0];
    } catch (err) {
      onError(err);
    }
  }
}
