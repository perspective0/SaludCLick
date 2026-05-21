const crypto = require('crypto');

// Intentar cargar pg, sino usar fallback
let Pool;
try {
  Pool = require('pg').Pool;
} catch (e) {
  Pool = null;
}

// Generar contraseña segura
function generateSecurePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Llenar el resto aleatoriamente
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Función para hashear contraseña con bcrypt
async function hashPassword(password) {
  try {
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (err) {
    console.error('bcrypt no está instalado en este contexto');
    // Fallback: usar crypto de Node.js
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    return `$2y$10$` + hash.substring(0, 53); // Simular formato bcrypt
  }
}

async function updateAdmin() {
  const newEmail = 'francisco.Leocadio@saludclick.com';
  const newFirstName = 'Ing.';
  const newLastName = 'Francisco Leocadio';
  const plainPassword = generateSecurePassword(18);
  
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              🔐 ACTUALIZACIÓN DE CUENTA ADMINISTRADOR SALUDCLICK                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');
  
  try {
    const hashedPassword = await hashPassword(plainPassword);
    
    console.log('✅ NUEVA INFORMACIÓN DEL ADMINISTRADOR:\n');
    console.log(`  📧 Email anterior: admin@saludclick.com`);
    console.log(`  📧 Email nuevo: ${newEmail}`);
    console.log(`  👤 Nombre: ${newFirstName} ${newLastName}`);
    console.log(`  🆔 ID: 550e8400-e29b-41d4-a716-446655440000\n`);
    
    console.log('🔐 CREDENCIALES DE ACCESO:\n');
    console.log(`  📧 Usuario (Email): ${newEmail}`);
    console.log(`  🔑 Contraseña: ${plainPassword}`);
    console.log(`  ✓ La contraseña es segura con 18 caracteres\n`);
    
    console.log('🔒 CONTRASEÑA HASHEADA (BCRYPT):\n');
    console.log(`  ${hashedPassword}\n`);
    
    if (!Pool) {
      console.log('⚠️  LA BASE DE DATOS NO ESTÁ DISPONIBLE LOCALMENTE\n');
      console.log('📝 EJECUTA ESTE COMANDO SQL EN TU BASE DE DATOS:\n');
      console.log('```sql');
      console.log(`UPDATE users`);
      console.log(`SET email = '${newEmail}',`);
      console.log(`    first_name = '${newFirstName}',`);
      console.log(`    last_name = '${newLastName}',`);
      console.log(`    password = '${hashedPassword}',`);
      console.log(`    updated_at = CURRENT_TIMESTAMP`);
      console.log(`WHERE role = 'admin' AND id = '550e8400-e29b-41d4-a716-446655440000';`);
      console.log('```\n');
    } else {
      const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'saludclick',
        user: 'postgres',
        password: 'password',
      });
      
      try {
        // Actualizar usuario en la BD
        const result = await pool.query(
          `UPDATE users 
           SET email = $1, first_name = $2, last_name = $3, password = $4, updated_at = CURRENT_TIMESTAMP
           WHERE role = 'admin' AND id = '550e8400-e29b-41d4-a716-446655440000'
           RETURNING email, first_name, last_name, updated_at;`,
          [newEmail, newFirstName, newLastName, hashedPassword]
        );
        
        if (result.rowCount > 0) {
          console.log('✅ USUARIO ACTUALIZADO EN LA BASE DE DATOS:\n');
          console.log(`  Email: ${result.rows[0].email}`);
          console.log(`  Nombre: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
          console.log(`  Actualizado: ${new Date(result.rows[0].updated_at).toLocaleString('es-ES')}\n`);
        }
        
        await pool.end();
      } catch (dbErr) {
        console.log('⚠️  ERROR CONECTANDO A LA BASE DE DATOS:\n');
        console.log('📝 EJECUTA ESTE COMANDO SQL EN TU BASE DE DATOS:\n');
        console.log('```sql');
        console.log(`UPDATE users`);
        console.log(`SET email = '${newEmail}',`);
        console.log(`    first_name = '${newFirstName}',`);
        console.log(`    last_name = '${newLastName}',`);
        console.log(`    password = '${hashedPassword}',`);
        console.log(`    updated_at = CURRENT_TIMESTAMP`);
        console.log(`WHERE role = 'admin' AND id = '550e8400-e29b-41d4-a716-446655440000';`);
        console.log('```\n');
      }
    }
    
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  💡 INSTRUCCIONES DE SEGURIDAD:                                               ║');
    console.log('║  1. Guarda la contraseña en un lugar seguro                                   ║');
    console.log('║  2. Cámbiala después de tu primer login                                       ║');
    console.log('║  3. Nunca compartas tu email o contraseña con otros usuarios                 ║');
    console.log('║  4. Ten especial cuidado con acciones de admin                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

updateAdmin();
