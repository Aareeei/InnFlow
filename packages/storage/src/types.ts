export type StorageArtifact = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
};

export interface StorageProvider {
  uploadArtifact(artifact: StorageArtifact): Promise<string>;
  getSignedArtifactUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteArtifact(key: string): Promise<void>;
  artifactExists(key: string): Promise<boolean>;
}
