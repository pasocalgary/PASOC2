import mysql from "mysql2/promise";

let pool;

if (!global.mysqlPool) {
	global.mysqlPool = mysql.createPool({
		host: process.env.MYSQL_HOST,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD,
		database: process.env.MYSQL_DATABASE,
		port: process.env.MYSQL_PORT || 3306,
		dateStrings: true,

		waitForConnections: true,
		connectionLimit: 10,
	});
}

pool = global.mysqlPool;

export default pool;
