'use client'

import { useState, useEffect, useCallback } from 'react'

interface TypewriterProps {
  words: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  className?: string
}

export function Typewriter({
  words,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseDuration = 2000,
  className = '',
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const tick = useCallback(() => {
    const currentWord = words[wordIndex]

    if (isPaused) {
      return
    }

    if (!isDeleting) {
      // Typing
      if (displayText.length < currentWord.length) {
        setDisplayText(currentWord.slice(0, displayText.length + 1))
      } else {
        // Finished typing, pause before deleting
        setIsPaused(true)
        setTimeout(() => {
          setIsPaused(false)
          setIsDeleting(true)
        }, pauseDuration)
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        setDisplayText(currentWord.slice(0, displayText.length - 1))
      } else {
        // Finished deleting, move to next word
        setIsDeleting(false)
        setWordIndex((prev) => (prev + 1) % words.length)
      }
    }
  }, [displayText, wordIndex, isDeleting, isPaused, words, pauseDuration])

  useEffect(() => {
    if (isPaused) return

    const speed = isDeleting ? deletingSpeed : typingSpeed
    const timer = setTimeout(tick, speed)

    return () => clearTimeout(timer)
  }, [tick, isDeleting, isPaused, typingSpeed, deletingSpeed])

  return (
    <span className={className}>
      {displayText}
      <span className="typewriter-cursor inline-block w-[2px] h-[1em] bg-current align-middle ml-0.5">
        &nbsp;
      </span>

      <style jsx>{`
        .typewriter-cursor {
          animation: cursor-blink 530ms steps(1) infinite;
        }
        @keyframes cursor-blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  )
}
