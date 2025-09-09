import React from 'react'

type Props = {
  name: string // file name in /Image folder, e.g. 'hdbank.jpg'
  size?: number
  alt?: string
  className?: string
  rounded?: number
}

export const ImageIcon: React.FC<Props> = ({ name, size = 20, alt = '', className = '', rounded = 6 }) => {
  return (
    <img
      src={`/Image/${name}`}
      alt={alt || name}
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size, borderRadius: rounded, objectFit: 'cover' }}
      className={className}
    />
  )
}

export default ImageIcon
