/**
 * Sets up the MySQL database schema and seeds the admin user.
 * Run: node backend/setup-db.js
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  const db = process.env.MYSQL_DATABASE;

  // Connect without database first to create it
  const root = await mysql.createConnection({
    host:     process.env.MYSQL_HOST,
    port:     Number(process.env.MYSQL_PORT),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
  });

  console.log(`Creating database '${db}' if not exists…`);
  // Use query() — DDL statements are not supported in prepared statement protocol
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${db}\``);
  await root.query(`USE \`${db}\``);

  // ─── Tables ────────────────────────────────────────────────────────────
  await root.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email       VARCHAR(255) NOT NULL UNIQUE,
      password    VARCHAR(255) NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await root.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
      name        VARCHAR(100) NOT NULL UNIQUE,
      is_active   TINYINT(1)   NOT NULL DEFAULT 1,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await root.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
      name        VARCHAR(100) NOT NULL,
      floor       VARCHAR(50),
      ward        VARCHAR(100),
      is_active   TINYINT(1)   NOT NULL DEFAULT 1,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await root.query(`
    CREATE TABLE IF NOT EXISTS services (
      id            CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
      name          VARCHAR(100) NOT NULL,
      department_id CHAR(36)     NOT NULL,
      designation   VARCHAR(100),
      is_active     TINYINT(1)   NOT NULL DEFAULT 1,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await root.query(`
    CREATE TABLE IF NOT EXISTS feedback_entries (
      id                  CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
      patient_name        VARCHAR(100),
      age                 TINYINT UNSIGNED,
      visit_type          ENUM('OPD','Inpatient','Emergency','Pharmacy','Lab') NOT NULL,
      admitted_date       DATE,
      relieved_date       DATE,
      department_id       CHAR(36)      NOT NULL,
      service_id          CHAR(36),
      location_id         CHAR(36),
      rating_doctor       TINYINT UNSIGNED,
      rating_cleanliness  TINYINT UNSIGNED NOT NULL,
      rating_staff        TINYINT UNSIGNED NOT NULL,
      rating_wait_time    TINYINT UNSIGNED NOT NULL,
      rating_overall      TINYINT UNSIGNED NOT NULL,
      comments            TEXT,
      submitted_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (service_id)   REFERENCES services(id),
      FOREIGN KEY (location_id)  REFERENCES locations(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ─── Location seed ─────────────────────────────────────────────────────
  const [locRows] = await root.execute(
    'SELECT id FROM locations WHERE id = ?', ['e4e1a66b-8b54-4a4a-9c7f-f7d1217e9154']
  );
  if (locRows.length === 0) {
    await root.execute(
      "INSERT INTO locations (id, name, floor, ward, is_active) VALUES ('e4e1a66b-8b54-4a4a-9c7f-f7d1217e9154', 'Chennai', '1st Floor', 'General', 1)"
    );
    console.log("✅ Seeded Chennai location");
  }

  // ─── Admin seed ────────────────────────────────────────────────────────
  const [rows] = await root.execute(
    'SELECT id FROM admins WHERE email = ?', [ADMIN_EMAIL]
  );
  if (rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await root.execute(
      'INSERT INTO admins (email, password) VALUES (?, ?)',
      [ADMIN_EMAIL, hash]
    );
    console.log(`\n✅ Admin created:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } else {
    console.log(`ℹ️  Admin '${ADMIN_EMAIL}' already exists — skipping seed.`);
  }

  await root.end();
  console.log('\n✅ Database setup complete!');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
