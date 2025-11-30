import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CHARACTER_DATA } from '@/constants/CharacterInfo';
import type { CharacterItem } from '@/types/CharacterInfoTypes';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  delay: number;
  color: string;
}

interface CelebrationEffectProps {
  character?: CharacterItem;
  onComplete: () => void;
}

export const CelebrationEffect = ({
  character = CHARACTER_DATA['eco'],
  onComplete,
}: CelebrationEffectProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // 3초 후 자동으로 사라지게
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className='fixed inset-0 z-9999 flex items-center justify-center overflow-hidden bg-black/80'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 배경 효과 */}
      <BackgroundEffect />

      {/* 축하 텍스트 */}
      <motion.div
        className='absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <p className='text-2xl leading-8 font-extrabold tracking-tight whitespace-pre text-white'>
          새로운 캐릭터를 획득했어요!
        </p>
      </motion.div>

      {/* 캐릭터 이미지 */}
      <motion.div
        className='absolute top-1/2 left-1/2 size-[186px] -translate-x-1/2 -translate-y-1/2'
        initial={{ opacity: 0, scale: 0.5, y: 30 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.8,
          delay: 0.2,
          ease: 'easeOut',
        }}
      >
        <motion.div
          className='pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden'
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <img
            alt={character.characterName}
            className='h-auto w-full object-contain'
            src={character.characterImage}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

function BackgroundEffect() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    // 반짝이는 파티클 생성
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 0.5,
      duration: Math.random() * 0.8 + 0.6,
    }));
    setParticles(newParticles);

    // Confetti 생성 (깔끔한 화이트톤)
    const colors = [
      'rgba(255,255,255,0.9)',
      'rgba(86,159,135,0.6)',
      'rgba(255,255,255,0.7)',
      'rgba(134,197,164,0.5)',
    ];
    const newConfetti: Confetti[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(newConfetti);
  }, []);

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden'>
      {/* 반짝이는 파티클 */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className='absolute rounded-full bg-white'
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: 3 - particle.duration - particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Confetti 효과 */}
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className='absolute h-3 w-2 rounded-sm'
          style={{
            left: `${item.x}%`,
            backgroundColor: item.color,
          }}
          initial={{ y: `${item.y}vh`, rotate: 0, opacity: 0 }}
          animate={{
            y: ['0vh', '120vh'],
            rotate: [item.rotation, item.rotation + 720],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3,
            delay: item.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
