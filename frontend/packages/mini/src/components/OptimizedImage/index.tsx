/**
 * 优化的图片组件
 * - 懒加载
 * - WebP支持
 * - 响应式加载
 * - 加载占位符
 */

import { useState, useEffect, useRef } from 'react';
import { Image, View, Text } from '@tarojs/components';
import { ImageOptimizer } from '../../config/webpack.optimization';
import './index.scss';

interface OptimizedImageProps {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  mode?: 'aspectFill' | 'aspectFit' | 'widthFix' | 'heightFix' | 'scaleToFill';
  lazy?: boolean;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

export default function OptimizedImage({
  src,
  width = 750,
  height = 750,
  quality = 80,
  mode = 'aspectFit',
  lazy = true,
  placeholder,
  className = '',
  onLoad,
  onError,
  style,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<any>(null);

  useEffect(() => {
    if (!lazy) {
      loadImage();
    }
  }, [src, width, height, quality]);

  // 懒加载观察器
  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  const loadImage = async () => {
    try {
      // 生成优化后的图片URL
      let optimizedSrc = src;

      // 如果是本地路径或已经包含查询参数,直接使用
      if (!src.startsWith('http') || src.includes('?')) {
        optimizedSrc = src;
      } else {
        // 生成带尺寸和质量参数的URL
        optimizedSrc = ImageOptimizer.getResponsiveUrl(src, width, quality);

        // 尝试使用WebP格式
        const supportsWebP = await ImageOptimizer.checkWebPSupport();
        if (supportsWebP) {
          optimizedSrc = ImageOptimizer.getWebPUrl(optimizedSrc);
        }
      }

      setImageSrc(optimizedSrc);
    } catch (err) {
      console.error('图片加载失败:', err);
      setError(true);
      setLoading(false);
      onError?.();
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    onError?.();
  };

  return (
    <View
      ref={imageRef}
      className={`optimized-image ${className}`}
      style={{
        width: `${width}rpx`,
        height: `${height}rpx`,
        ...style,
      }}
    >
      {loading && (
        <View className="optimized-image__placeholder">
          {placeholder ? (
            <Image src={placeholder} mode={mode} className="optimized-image__placeholder-img" />
          ) : (
            <View className="optimized-image__skeleton">
              <Text className="optimized-image__skeleton-text">加载中...</Text>
            </View>
          )}
        </View>
      )}

      {error && (
        <View className="optimized-image__error">
          <Text className="optimized-image__error-text">图片加载失败</Text>
        </View>
      )}

      {imageSrc && (
        <Image
          src={imageSrc}
          mode={mode}
          className={`optimized-image__img ${loaded ? 'optimized-image__img--loaded' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          lazyLoad={lazy}
          showMenuByLongpress
        />
      )}
    </View>
  );
}
