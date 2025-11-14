# Repair Quotation Frontend

Frontend application สำหรับระบบจัดการใบเสนอราคาและซ่อมแซมอุปกรณ์ สร้างด้วย Angular และ Angular Material

## เทคโนโลยีที่ใช้

- **Angular** - Framework สำหรับสร้าง Single Page Application
- **Angular Material** - UI Component Library
- **TypeScript** - Programming Language
- **RxJS** - Reactive Programming Library
- **Jest** - Testing Framework

## ความต้องการของระบบ

- Node.js (v18 หรือสูงกว่า)
- npm หรือ yarn

## การติดตั้ง

1. Clone repository:
```bash
git clone <repository-url>
cd repair-quotation-frontend
```

2. ติดตั้ง dependencies:
```bash
npm install
```

3. สร้างไฟล์ environment configuration:
```bash
# สร้างไฟล์ environment.ts
cp src/environments/environment.example.ts src/environments/environment.ts

# แก้ไข API URL ให้ตรงกับ backend
# แก้ไขไฟล์ src/environments/environment.ts
```

4. เริ่มต้น development server:
```bash
npm start
# หรือ
ng serve
```

แอปพลิเคชันจะรันที่ `http://localhost:4200`

## การ Build

### Development Build:
```bash
npm run build
```

### Production Build:
```bash
npm run build:prod
```

ไฟล์ที่ build จะอยู่ในโฟลเดอร์ `dist/`

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── core/              # Core modules (guards, interceptors, services, layouts)
│   ├── features/          # Feature modules
│   │   ├── admin/         # Admin features
│   │   ├── auth/          # Authentication
│   │   ├── customers/     # Customer management
│   │   ├── device-categories/  # Device category management
│   │   ├── devices/       # Device management
│   │   ├── invoices/     # Invoice management
│   │   ├── quotes/        # Quotation management
│   │   ├── repairs/       # Repair management
│   │   └── reports/       # Reports
│   └── shared/            # Shared components
├── environments/          # Environment configuration
└── styles.scss           # Global styles
```

## Environment Configuration

สร้างไฟล์ `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api'
};
```

สำหรับ production สร้าง `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://your-api-domain.com/api'
};
```

## Scripts

- `npm start` - เริ่ม development server
- `npm run build` - Build สำหรับ development
- `npm run build:prod` - Build สำหรับ production
- `npm test` - รัน unit tests
- `npm run lint` - ตรวจสอบ code quality

## Features

### Authentication
- Login/Logout
- Role-based access control
- Token management

### Customer Management
- สร้าง/แก้ไข/ลบข้อมูลลูกค้า
- จัดการอุปกรณ์ของลูกค้า
- ดูรายละเอียดลูกค้า

### Device Management
- จัดการหมวดหมู่อุปกรณ์ (Device Categories)
- จัดการอุปกรณ์ (Devices)
- ตั้งค่าอุปกรณ์พร้อมหมวดหมู่

### Quotation Management
- สร้างใบเสนอราคา
- จัดการรายการอะไหล่/บริการ
- ดูรายละเอียดใบเสนอราคา

### Admin
- จัดการผู้ใช้งาน
- Reset password

## Development Guidelines

### Code Style
- ใช้ TypeScript Type System อย่างเต็มที่
- หลีกเลี่ยงการใช้ `any`
- ใช้ Interface สำหรับโครงสร้างข้อมูล
- ใช้ Immutability และ Pure Functions
- ใช้ Component Composition

### File Naming
- ใช้ kebab-case สำหรับชื่อไฟล์
- ใช้ suffix ที่ถูกต้อง: `.component.ts`, `.service.ts`, `.model.ts`

### State Management
- ใช้ Angular Signals สำหรับ reactive state
- ใช้ `inject()` function สำหรับ dependency injection

### Best Practices
- ใช้ `OnPush` change detection strategy
- ใช้ `async` pipe สำหรับ Observables
- ใช้ `trackBy` function กับ `ngFor`
- หลีกเลี่ยงการ manipulate DOM โดยตรง

## Testing

```bash
npm test
```

## Troubleshooting

### Port 4200 ถูกใช้งานแล้ว
```bash
ng serve --port 4201
```

### Build errors
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

## License

[ระบุ license ของโปรเจค]
