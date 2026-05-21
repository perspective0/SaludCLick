const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'saludclick',
  user: 'postgres',
  password: 'password'
});

const sql = `
  UPDATE users
  SET email = 'francisco.Leocadio@saludclick.com',
      first_name = 'Ing.',
      last_name = 'Francisco Leocadio',
      password = '$2y$10$aa8656d8ec618b05ce7c1ae3cd43a4fce12d162800857134d011e',
      updated_at = CURRENT_TIMESTAMP
  WHERE role = 'admin' AND id = '550e8400-e29b-41d4-a716-446655440000'
`;

client.connect()
  .then(() => client.query(sql))
  .then(res => {
    console.log('UPDATE exitoso. Filas afectadas:', res.rowCount);
    return client.end();
  })
  .catch(err => {
    console.error('Error completo:', JSON.stringify(err, null, 2));
    console.error('Mensaje:', err.message);
    console.error('Codigo:', err.code);
    client.end();
  });
