import React, { useState, useEffect, useRef, useCallback } from 'react';

import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfSlideshow({ pdfUrl }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const pdfDocRef = useRef(null);
    const renderingRef = useRef(false);
    const cacheRef = useRef({});
    const currentScaleRef = useRef(0);
    const preloadingRef = useRef(false);

    const preloadAdjacentPages = useCallback(async (currentNum, targetScale) => {
        if (preloadingRef.current || !pdfDocRef.current) return;
        preloadingRef.current = true;
        
        try {
            const total = pdfDocRef.current.numPages;
            const offsets = [1, -1, 2, -2, 3, -3];
            for (const offset of offsets) {
                const targetNum = currentNum + offset;
                if (targetNum < 1 || targetNum > total) continue;
                
                if (cacheRef.current[targetNum] && cacheRef.current[targetNum].scale === targetScale) continue;
                
                const page = await pdfDocRef.current.getPage(targetNum);
                const viewport = page.getViewport({ scale: targetScale });
                
                const offCanvas = document.createElement('canvas');
                offCanvas.width = viewport.width;
                offCanvas.height = viewport.height;
                const ctx = offCanvas.getContext('2d');
                
                await page.render({ canvasContext: ctx, viewport }).promise;
                
                if (currentScaleRef.current === targetScale) {
                    cacheRef.current[targetNum] = { canvas: offCanvas, scale: targetScale };
                }
            }
            
            const keysToKeep = new Set();
            for(let i = -3; i <= 3; i++) keysToKeep.add(String(currentNum + i));
            Object.keys(cacheRef.current).forEach(key => {
                if (!keysToKeep.has(key)) delete cacheRef.current[key];
            });
        } catch (err) {
            console.error('Preloading error:', err);
        } finally {
            preloadingRef.current = false;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function initViewer() {
            try {
                const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                if (!isMounted) return;

                pdfDocRef.current = pdfDoc;
                setTotalPages(pdfDoc.numPages);
                setLoading(false);
                renderPage(1);
            } catch (err) {
                if (!isMounted) return;
                setError(err.message);
                setLoading(false);
            }
        }

        initViewer();

        return () => {
            isMounted = false;
        };
    }, [pdfUrl]);

    const renderPage = useCallback(async (num) => {
        if (!pdfDocRef.current || !canvasRef.current) return;

        try {
            const page = await pdfDocRef.current.getPage(num);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            const containerWidth = canvas.parentElement.clientWidth;
            const containerHeight = canvas.parentElement.clientHeight;
            const viewport = page.getViewport({ scale: 1 });

            let scale = containerWidth / viewport.width;
            if (document.fullscreenElement) {
                const scaleH = containerHeight / viewport.height;
                scale = Math.min(scale, scaleH);
            }

            const dpr = window.devicePixelRatio || 1;
            const finalScale = scale * dpr;

            if (Math.abs(currentScaleRef.current - finalScale) > 0.01) {
                cacheRef.current = {};
                currentScaleRef.current = finalScale;
            }

            const scaledViewport = page.getViewport({ scale: finalScale });

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${viewport.width * scale}px`;
            canvas.style.height = `${viewport.height * scale}px`;
            canvas.style.maxWidth = '100%';

            if (cacheRef.current[num] && cacheRef.current[num].scale === finalScale) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(cacheRef.current[num].canvas, 0, 0);
                setCurrentPage(num);
                preloadAdjacentPages(num, finalScale);
                return;
            }

            if (renderingRef.current) return;
            renderingRef.current = true;

            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            setCurrentPage(num);

            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            offCanvas.getContext('2d').drawImage(canvas, 0, 0);
            cacheRef.current[num] = { canvas: offCanvas, scale: finalScale };

        } catch (err) {
            console.error('Error rendering page:', err);
        } finally {
            renderingRef.current = false;
            preloadAdjacentPages(num, currentScaleRef.current);
        }
    }, [preloadAdjacentPages]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            if (containerRef.current?.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setTimeout(() => renderPage(currentPage), 100);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [currentPage, renderPage]);

    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                renderPage(currentPage);
            }, 150);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [currentPage, renderPage]);

    const changePage = useCallback((delta) => {
        if (!pdfDocRef.current || renderingRef.current) return;
        const next = currentPage + delta;
        if (next < 1 || next > pdfDocRef.current.numPages) return;
        renderPage(next);
    }, [currentPage, renderPage]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                changePage(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                changePage(-1);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [changePage]);

    return (
        <div className={`pdf-slideshow ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
            <div className="pdf-canvas-container">
                <canvas ref={canvasRef} id="pdf-canvas"></canvas>
                {loading && (
                    <div id="pdf-loading" className="pdf-loading">
                        <div className="pdf-spinner"></div>
                        <span>Loading PDF…</span>
                    </div>
                )}
                {error && (
                    <div id="pdf-loading" className="pdf-loading" style={{ display: 'flex' }}>
                        <span style={{ color: '#c00' }}>Failed to load PDF.<br />{error}</span>
                    </div>
                )}
            </div>

            <div className="pdf-controls">
                <button
                    id="btn-prev"
                    className="pdf-btn"
                    aria-label="Previous slide"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => changePage(-1)}
                >
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </button>

                <div className="pdf-page-info">
                    <span id="page-current">{currentPage}</span>
                    <span className="page-sep">/</span>
                    <span id="page-total">{totalPages || '—'}</span>
                </div>

                <button
                    id="btn-next"
                    className="pdf-btn"
                    aria-label="Next slide"
                    disabled={currentPage >= totalPages || totalPages === 0 || loading}
                    onClick={() => changePage(1)}
                >
                    <span className="material-symbols-outlined">arrow_forward_ios</span>
                </button>

                <button
                    className="pdf-btn fullscreen-btn"
                    onClick={toggleFullscreen}
                    aria-label="Toggle Fullscreen"
                    title="Toggle Fullscreen"
                    style={{ marginLeft: '1rem' }}
                >
                    <span className="material-symbols-outlined">
                        {isFullscreen ? 'close' : 'fullscreen'}
                    </span>
                </button>
            </div>

            <p className="keyboard-hint">
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>keyboard</span>
                Use arrow keys to navigate
            </p>
        </div>
    );
}
