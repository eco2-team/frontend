# iOS PWA 카메라 문제 해결 계획

> 작성일: 2025-12-21
> 상태: 계획 수립 완료

## 1. 문제 분석

### 현재 상황
| 단계 | 결과 | 비고 |
|------|------|------|
| `getUserMedia()` | ✅ 성공 | 스트림 획득 |
| `video.srcObject = stream` | ✅ 성공 | 할당됨 |
| `video.videoWidth/Height` | ✅ 480x640 | 크기 정보 존재 |
| `video.play()` | ✅ paused: false | 재생 상태 |
| 화면 렌더링 | ❌ 검은/Navy 화면 | **문제** |
| `ctx.drawImage(video)` | ❌ rgba(0,0,0,0) | 빈 프레임 |
| 캡쳐 버튼 클릭 | ⚠️ 일부 작동 | 간헐적 |

### 환경 정보
```
User Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15
iOS 기기: false (User Agent 위장됨)
PWA 모드: true
Safari: true
navigator.standalone: true
display-mode: browser (실제는 standalone)
```

### 핵심 문제
**iOS PWA standalone 모드**에서 `<video>` 엘리먼트가 DOM에서 시각적으로 렌더링되지 않으면, 
WebKit이 **프레임 데이터를 생성하지 않음** → `drawImage()`가 빈 프레임 반환

### 브라우저 vs PWA 차이
| 환경 | getUserMedia | video 렌더링 | drawImage |
|------|-------------|--------------|-----------|
| Safari 브라우저 | ✅ | ✅ | ✅ |
| Chrome 브라우저 | ✅ | ✅ | ✅ |
| **iOS PWA (standalone)** | ✅ | ❌ | ❌ |

---

## 2. 외부 베스트 프랙티스 조사 결과

### 2.1 공식 문서 및 권장사항

#### Apple WebKit
- `playsinline` 속성 필수 (iOS Safari 인라인 재생)
- 사용자 상호작용 후 `play()` 호출 권장
- 백그라운드 스트림 처리 제한

#### ZEGOCLOUD (WebRTC 전문 업체)
- H.264 코덱 기본 설정
- TURN 서버 통합 권장
- 명시적 권한 요청 UI

#### Daily.co (WebRTC 플랫폼)
- `video.paused` 체크 후 `play()` 호출
- 불필요한 미디어 요소 추가/제거 방지
- `canplay` 이벤트 활용

### 2.2 알려진 iOS PWA 제한사항

1. **백그라운드 작업 제한**: PWA가 백그라운드로 전환되면 스트림 중단
2. **캐시 문제**: Service Worker 캐시로 인한 업데이트 지연
3. **visibilitychange 이슈**: 포그라운드 복귀 시 비디오 멈춤 (iOS 26 버그)
4. **video 크기 제한**: 너무 작은 video 요소는 프레임 미생성

### 2.3 성공 사례

#### TikTok PWA 방식
- `srcObject` 대신 **blob URL** 사용
- MediaRecorder로 스트림 → blob 변환 → `video.src` 설정

#### WorkoutGen PWA (2025)
- iOS 26 비디오 버그 대응
- `visibilitychange` 이벤트 감지 후 video 재설정

---

## 3. 해결 방안 후보

### Plan A: video 가시성 강제 (이미 시도, 실패)
```jsx
// ❌ 실패한 접근
<video style={{ opacity: 0.01, zIndex: 1 }} />
<canvas style={{ zIndex: 2 }} />
```
**결과**: drawImage 여전히 빈 프레임

---

### Plan B: PWA display mode 변경 ⭐ 권장
```json
// manifest.json
{
  "display": "minimal-ui"  // standalone → minimal-ui
}
```

**장점:**
- 브라우저 수준의 WebRTC 지원
- 코드 변경 최소화

**단점:**
- 주소창/툴바가 보임 (UX 변화)
- PWA "앱 느낌" 감소

---

### Plan C: Native Camera Input 사용 ⭐ 가장 안정적
```jsx
<input 
  type="file" 
  accept="image/*" 
  capture="environment"
  onChange={handleCapture}
/>
```

**장점:**
- 100% 안정적 작동
- iOS 네이티브 카메라 UI 사용

**단점:**
- **실시간 미리보기 불가**
- UX 완전히 다름 (네이티브 카메라 앱 실행)

---

### Plan D: iOS PWA 감지 → Safari 리다이렉트
```javascript
const isIOSPWA = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                  window.navigator.standalone === true;

if (isIOSPWA) {
  // Safari 브라우저로 리다이렉트
  window.location.href = `safari-https://${window.location.host}/camera`;
}
```

**장점:**
- Safari에서 완벽 작동

**단점:**
- 앱 전환 UX 불편
- `safari-https://` URL 스킴 미지원 가능성

---

### Plan E: video 직접 표시 (Full Visibility) ⭐ 시도 가치
```jsx
// video를 실제로 화면에 표시 (투명 처리 없음)
<div className="relative">
  <video 
    className="absolute inset-0 w-full h-full object-cover"
    autoPlay playsInline muted
  />
  {/* UI 오버레이 */}
  <div className="absolute inset-0 pointer-events-none">
    <img src={CameraFrame} />
  </div>
  <button onClick={capture}>캡쳐</button>
</div>
```

**핵심 아이디어:**
- video를 숨기지 않고 **그대로 표시**
- UI 요소를 video 위에 오버레이
- iOS가 video를 렌더링하도록 강제

**장점:**
- WebRTC 유지
- 실시간 미리보기 가능

**단점:**
- Canvas 미러링 불필요 (직접 video 표시)

---

### Plan F: MediaStreamTrackProcessor (WebCodecs) 🆕
```javascript
// iOS Safari 16.4+ 지원
const track = stream.getVideoTracks()[0];
const processor = new MediaStreamTrackProcessor({ track });
const reader = processor.readable.getReader();

async function readFrames() {
  while (true) {
    const { value: frame, done } = await reader.read();
    if (done) break;
    
    // VideoFrame을 Canvas에 그리기
    ctx.drawImage(frame, 0, 0);
    frame.close();
  }
}
```

**장점:**
- 저수준 프레임 접근
- video 엘리먼트 불필요

**단점:**
- iOS Safari 16.4+ 필요
- 복잡한 구현

---

## 4. 권장 실행 계획

### Phase 1: Plan E 시도 (video 직접 표시)
가장 간단하고 WebRTC를 유지하는 방법

```jsx
// Camera.tsx 수정
<div ref={containerRef} className="relative h-full">
  {/* video를 직접 표시 (숨기지 않음) */}
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="h-full w-full object-cover"
  />
  
  {/* UI 오버레이 (video 위에 표시) */}
  <div className="absolute inset-0 pointer-events-none">
    <img src={CameraContainer} className="..." />
    <p>사물이 잘 보이게 찍어주세요</p>
  </div>
  
  {/* 캡쳐 버튼 */}
  <button 
    onClick={handleCapture}
    className="absolute bottom-20 left-1/2 -translate-x-1/2"
  >
    <img src={CameraButton} />
  </button>
</div>
```

**예상 결과:**
- iOS PWA에서 video가 직접 화면에 표시됨
- WebKit이 프레임을 생성하여 렌더링
- 캡쳐 시 drawImage 정상 작동

---

### Phase 2: Plan C 대체 (실패 시)
Plan E 실패 시 Native Camera Input으로 전환

```jsx
// iOS PWA 전용 분기
const isIOSPWA = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                  window.navigator.standalone;

if (isIOSPWA) {
  return (
    <div>
      <p>카메라로 사진을 촬영하세요</p>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handleFileCapture}
      />
    </div>
  );
}

// 기존 WebRTC 방식 유지 (브라우저용)
return <WebRTCCamera />;
```

---

### Phase 3: Plan B 고려 (최후의 수단)
PWA display mode를 `minimal-ui`로 변경

```typescript
// vite.config.ts
VitePWA({
  manifest: {
    display: 'minimal-ui',  // standalone → minimal-ui
  }
})
```

---

## 5. 테스트 체크리스트

### Plan E 테스트
- [ ] iOS PWA에서 video가 화면에 보이는지
- [ ] 캡쳐 버튼 클릭 시 drawImage 정상 작동
- [ ] 캡쳐된 이미지가 CDN에 정상 업로드
- [ ] Safari/Chrome 브라우저에서 기존처럼 작동

### 환경별 테스트
- [ ] iOS 17.x PWA
- [ ] iOS 18.x PWA
- [ ] iOS Safari 브라우저
- [ ] Android Chrome PWA
- [ ] Desktop Chrome/Safari

---

## 6. 참고 자료

### 공식 문서
- [WebRTC iOS Safari FAQ](https://webrtc.org/getting-started/faq)
- [Apple Safari Video Content Guide](https://developer.apple.com/documentation/webkit/delivering_video_content_for_safari)

### 기술 블로그
- [ZEGOCLOUD Safari WebRTC](https://www.zegocloud.com/blog/apple-safari-webrtc)
- [Daily.co WebRTC Performance Tips](https://www.daily.co/blog/tips-to-improve-performance/)
- [WorkoutGen PWA Journey 2025](https://workoutgen.app/articles/workoutgen-pwa-technical-journey-2025/)
- [WebRTC iOS Black Box](https://tech-wiki.online/posts/webrtc-ios-black-box/)

### 커뮤니티 이슈
- [Apple Developer Forums - PWA Video Issue](https://discussions.apple.com/thread/256166996)

---

## 7. 결론

**1차 시도: Plan E (video 직접 표시)**
- 코드 변경 최소
- WebRTC 유지
- 실시간 미리보기 유지

**실패 시: Plan C (Native Camera Input)**
- iOS PWA 전용 분기 처리
- 100% 안정성 보장
- UX 차이 감수

---

## 8. 즉시 실행 가능한 코드

### useCamera.tsx 수정 불필요
기존 코드 유지

### Camera.tsx 수정
```jsx
// Canvas 미러링 제거, video 직접 표시
<div ref={containerRef} className='relative h-full overflow-hidden'>
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className='h-full w-full object-cover'  // 직접 표시
  />
  
  {/* 나머지 UI는 absolute로 video 위에 오버레이 */}
  {/* ... */}
</div>
```

이 방식이 **가장 간단하고 원래 코드와 가장 유사**합니다.
실패 시 Native Input 방식으로 전환합니다.

