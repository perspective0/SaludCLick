const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'saludclick',
  user: 'postgres',
  password: 'password',
});

(async () => {
  try {
    const result = await pool.query('SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at DESC');
    console.log('\n=== USUARIOS REGISTRADOS EN SALUDCLICK ===\n');
    
    if (result.rows.length === 0) {
      console.log('No hay usuarios registrados aún.\n');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Estado: ${user.is_active ? 'Activo' : 'Inactivo'}`);
        console.log(`   Creado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
        console.log(`   ID: ${user.id}`);
        console.log();
      });
      console.log(`\nTotal de usuarios: ${result.rows.length}\n`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error conectando a la base de datos:', err.message);
  }
})();
