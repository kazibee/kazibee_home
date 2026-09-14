import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Component, Inject, LoadAs } from "@noego/ioc";
import Env from "./env";

/**
 * AWS S3 boundary for the download bucket. Owns the single S3Client and the
 * presigner call; DownloadService decides which commands to issue and how to
 * interpret their outcomes.
 */
@Component({ scope: LoadAs.Singleton })
export default class DownloadObjectStore {
  readonly region: string;
  private readonly client: S3Client;

  constructor(@Inject(Env) env: Env) {
    const region = env.get("AWS_REGION");
    this.region = typeof region === "string" ? region : "ca-central-1";
    this.client = new S3Client({ region: this.region });
  }

  dispose(): void {
    this.client.destroy();
  }

  send(command: ListObjectsV2Command): Promise<ListObjectsV2CommandOutput>;
  send(command: HeadObjectCommand): Promise<HeadObjectCommandOutput>;
  send(command: GetObjectCommand): Promise<GetObjectCommandOutput>;
  send(command: ListObjectsV2Command | HeadObjectCommand | GetObjectCommand): Promise<unknown> {
    return this.client.send(command as never);
  }

  presign(command: GetObjectCommand, options: { expiresIn: number }): Promise<string> {
    return getSignedUrl(this.client, command, options);
  }
}
