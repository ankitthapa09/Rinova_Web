/** Minimal typings for gltf-pipeline (no official @types package), just the
 * one function and options we use for Draco-compressing uploaded GLBs. */
declare module 'gltf-pipeline' {
  interface DracoOptions {
    /** 0-10; higher = smaller file, slower compression */
    compressionLevel?: number;
  }
  interface ProcessGlbOptions {
    dracoOptions?: DracoOptions;
  }
  interface ProcessGlbResult {
    glb: Buffer;
  }
  export function processGlb(glb: Buffer, options?: ProcessGlbOptions): Promise<ProcessGlbResult>;
}
