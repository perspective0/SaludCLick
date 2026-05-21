"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const doctors_1 = __importDefault(require("./routes/doctors"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const medical_1 = __importDefault(require("./routes/medical"));
const doctorRequest_1 = __importDefault(require("./routes/doctorRequest"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Static files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SaludClick API is running',
        timestamp: new Date().toISOString(),
    });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/doctors', doctors_1.default);
app.use('/api/appointments', appointments_1.default);
app.use('/api/medical-records', medical_1.default);
app.use('/api/doctor-request', doctorRequest_1.default);
app.use('/api/admin', admin_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : undefined,
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 SaludClick API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map