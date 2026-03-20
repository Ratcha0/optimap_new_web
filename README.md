# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# optimap_web
# optimap_new_web


# สถานะการปรับปรุงระบบ (ล่าสุด: 24 ก.พ. 2026)

### ✅ รายการที่แก้ไขแล้ว:
1.  **Bug ความเร็วซิกแซก/คูณพ้น:** (แก้ไขแล้ว) ลบการคูณหน่วย 3.6 ซ้ำซ้อนใน HUD และ Car Simulator ทำให้ข้อมูลความเร็วถูกต้องแม่นยำ
2.  **ปัญหา GPS จริงดึงกลับในหน้าจำลอง:** (แก้ไขแล้ว) เพิ่มระบบ `isSimulating` Flag เพื่อบล็อกค่าจาก GPS จริงไม่ให้กวนโหมดจำลอง ทำให้เส้นทางนิ่งและไม่เกิดการ Reroute เอง
3.  **ความลื่นไหลของแผนที่:** (แก้ไขแล้ว) ตัด Props `currentSpeed` ที่ไม่ได้ใช้งานออกจากแผนที่ ช่วยลดภาระการ Render ทำให้แผนที่ทำงานได้เร็วขึ้น
4.  **ความสะอาดของโค้ด:** (แก้ไขแล้ว) ลบเศษซาก Log/Error เช็คของ Leaflet (Legacy Code) ออกทั้งหมด

### 💡 จุดที่ควรระวังต่อ:
*   **API Quota:** OSRM ให้บริการฟรีแต่มี Limit หากใช้งานหนักควรพิจารณาใช้ระบบสำรอง (OSM Fallback) ที่เตรียมไว้ใน `useRouting`
*   **GPS Accuracy:** หากใช้งานในอาคาร GPS อาจแกว่งได้ ระบบมี Filter `accuracy > 60` ช่วยกรองเบื้องต้นอยู่แล้ว



ข้อมูลตอนกดที่รถ 

1. RPM
2. Speed
3. Engine load
4. throttle position
5. Engine Runtime
6. Coolant temp
7. Intake Air Temp
8. Ambient Temp
9. oil Temp
10.Fuel rate
11.Barometric pressure
12.Distance Since Mil
13.VIN


Add vehicle status display to the map. Waiting for p'Khwan.


ลำดับ	รายการที่ต้องการ (User Request)	สถานะในระบบปัจจุบัน	ข้อมูลที่มีในระบบตอนนี้ (Field Name)
1	RPM (รอบเครื่องยนต์)	                    ❌ ไม่มี	-
2	Speed (ความเร็ว)	                        ✅ มีแล้ว	vehicle_speed
3	Engine load (ภาระเครื่องยนต์)	            ❌ ไม่มี	-
4	Throttle position (ตำแหน่งลิ้นเร่ง)	        ❌ ไม่มี	-
5	Engine Runtime (เวลาทำงานเครื่องยนต์)	    ❌ ไม่มี	-
6	Coolant temp (อุณหภูมิน้ำหล่อเย็น)	       ✅ มีแล้ว	engine_temp (แสดงเป็นอุณหภูมิ °C)
7	Intake Air Temp (อุณหภูมิอากาศขาเข้า)	    ❌ ไม่มี	-
8	Ambient Temp (อุณหภูมิภายนอก)	            ❌ ไม่มี	-
9	Oil Temp (อุณหภูมิน้ำมันเครื่อง)	            ⚠️ มีบางส่วน	ปัจจุบันมี oil_level (ระดับน้ำมันเครื่อง %) แต่ยังไม่มีค่า Temp
10	Fuel rate (อัตราการกินน้ำมัน)	            ⚠️ มีบางส่วน	ปัจจุบันมี fuel_level (ระดับน้ำมันคงเหลือ %) แต่ยังไม่มีค่า Rate
11	Barometric pressure (ความดันบรรยากาศ)	    ❌ ไม่มี	-
12	Distance Since Mil (ระยะทางหลังไฟเตือน)	    ❌ ไม่มี	-
13	VIN (เลขตัวถังรถ)	                    ❌ ไม่มี	ปัจจุบันมี car_reg (เลขทะเบียน) แต่ไม่ใช่เลข VIN




ส่วนของ location_logs ID ของรถเพิ่ม rpm

เพื่อที่จะแสดงพวกตำแหน่งของรถ
ความเร็ว บันทกเป็น ว่าเราขับไปไหนใช้ความเร็วและรอบเครื่องเท่าไหร่ ณ เวลานั้นๆ

เราไม่ต้องจับจาก VIn ควรจับจาก id เหมือนเดิม


