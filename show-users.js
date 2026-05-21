// Script to display sample users
const sampleUsers = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "admin@saludclick.com",
    first_name: "Admin",
    last_name: "SaludClick",
    role: "admin",
    phone: "+34 612 345 678",
    is_active: true,
    created_at: "2026-05-01T10:00:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "drgarcia@saludclick.com",
    first_name: "Dr. Juan",
    last_name: "García López",
    role: "doctor",
    phone: "+34 612 345 679",
    is_active: true,
    created_at: "2026-05-05T14:30:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    email: "drsanchez@saludclick.com",
    first_name: "Dra. María",
    last_name: "Sánchez Rodríguez",
    role: "doctor",
    phone: "+34 612 345 680",
    is_active: true,
    created_at: "2026-05-06T09:15:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    email: "carmen.secretary@saludclick.com",
    first_name: "Carmen",
    last_name: "Martínez Pérez",
    role: "secretary",
    phone: "+34 612 345 681",
    is_active: true,
    created_at: "2026-05-07T11:45:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    email: "paciente1@saludclick.com",
    first_name: "Carlos",
    last_name: "Fernández Gómez",
    role: "patient",
    phone: "+34 612 345 682",
    is_active: true,
    created_at: "2026-05-10T16:20:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    email: "paciente2@saludclick.com",
    first_name: "Isabel",
    last_name: "López Torres",
    role: "patient",
    phone: "+34 612 345 683",
    is_active: true,
    created_at: "2026-05-12T08:50:00.000Z"
  }
];

console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     👥 USUARIOS REGISTRADOS EN SALUDCLICK                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

sampleUsers.forEach((user, index) => {
  const roleEmoji = {
    admin: '👨‍💼',
    doctor: '👨‍⚕️',
    secretary: '👩‍💻',
    patient: '👤'
  };
  
  const roleLabel = {
    admin: 'Administrador',
    doctor: 'Médico',
    secretary: 'Secretaria',
    patient: 'Paciente'
  };

  console.log(`${index + 1}. ${roleEmoji[user.role]} ${user.first_name} ${user.last_name}`);
  console.log(`   📧 Email: ${user.email}`);
  console.log(`   🏷️  Rol: ${roleLabel[user.role]}`);
  console.log(`   📱 Teléfono: ${user.phone || 'No disponible'}`);
  console.log(`   ✅ Estado: ${user.is_active ? 'Activo' : 'Inactivo'}`);
  console.log(`   🕐 Registrado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
  console.log(`   🔑 ID: ${user.id}`);
  console.log();
});

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log(`║  Total de usuarios: ${sampleUsers.length}                                                         ║`);
console.log('║                                                                                ║');
console.log('║  📊 RESUMEN POR ROL:                                                           ║');
console.log(`║     • Administradores: ${sampleUsers.filter(u => u.role === 'admin').length}                                                    ║`);
console.log(`║     • Médicos: ${sampleUsers.filter(u => u.role === 'doctor').length}                                                        ║`);
console.log(`║     • Secretarias: ${sampleUsers.filter(u => u.role === 'secretary').length}                                                   ║`);
console.log(`║     • Pacientes: ${sampleUsers.filter(u => u.role === 'patient').length}                                                      ║`);
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

// Información del usuario admin
console.log('📝 TU CUENTA DE ADMINISTRADOR:\n');
const adminUser = sampleUsers.find(u => u.role === 'admin');
console.log(`  👤 Nombre: ${adminUser.first_name} ${adminUser.last_name}`);
console.log(`  📧 Email: ${adminUser.email}`);
console.log(`  🔐 Rol: Administrador del Sistema`);
console.log(`  ✅ Acceso: Completo`);
console.log(`  📱 Teléfono: ${adminUser.phone}`);
console.log(`  🕐 Miembro desde: ${new Date(adminUser.created_at).toLocaleString('es-ES')}\n`);

console.log('💡 Con tu cuenta de admin puedes:');
console.log('   • Gestionar todos los usuarios del sistema');
console.log('   • Aprobar solicitudes de médicos');
console.log('   • Ver y modificar configuraciones globales');
console.log('   • Acceder a reportes y estadísticas\n');
