import { dockerImagesCli, reasonOf, systemProcess } from '../core/index.js';
import type { ContainerInfo, ImageInfo, ImagePort } from '../core/index.js';
import { scoringImage } from '../scoring/index.js';

import { count, EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/**
 * The images the benchmark builds, by full reference (bug-015, task-061): a dry run's, a campaign's (its id) and the
 * scoring image's. Anchored, so that an image of anyone else's that merely starts like one — an ECR registry host of
 * 12 hex characters — never matches.
 */
const BENCHMARK_IMAGES: readonly RegExp[] = [
  /^dry-[0-9a-f]{12}:latest$/,
  /^[0-9a-f]{12}:latest$/,
  /^bench-score:[0-9a-f]{12}$/,
];

/**
 * The benchmark's named containers start with this: a run's (`bench-<id>-`) and a scoring one's. The short-lived
 * `docker run --rm` of a harness build or the project rules has a random name; while it exists, its image is kept by
 * id like any container's.
 */
const BENCHMARK_CONTAINER = 'bench-';

/** What a prune would do: the images to remove, and the benchmark's images it keeps, with why. */
export interface Prune {
  readonly remove: readonly ImageInfo[];
  readonly kept: readonly { readonly image: ImageInfo; readonly reason: string }[];
}

/**
 * The benchmark's images that nothing needs: not the current scoring image (`currentScoring`), and not the image of
 * any container, in any state, compared by id. Images that are not the benchmark's are neither removed nor kept.
 */
export function pruneCandidates(
  images: readonly ImageInfo[],
  containers: readonly ContainerInfo[],
  currentScoring: string,
): Prune {
  const remove: ImageInfo[] = [];
  const kept: { image: ImageInfo; reason: string }[] = [];
  for (const image of images) {
    if (!BENCHMARK_IMAGES.some((pattern) => pattern.test(image.reference))) continue;
    const user = containers.find((container) => container.imageId === image.id);
    if (image.reference === currentScoring) kept.push({ image, reason: 'the current scoring image' });
    else if (user !== undefined) kept.push({ image, reason: `used by container ${user.name}` });
    else remove.push(image);
  }
  return { remove, kept };
}

/**
 * `bench images prune [--dry-run]` (bug-015): removes the benchmark's images that nothing needs, and prints each one,
 * those it keeps and why, and the count. It refuses while a benchmark container is running. That guard is partial: a
 * campaign, a dry run or a scoring in progress holds no container between two runs (or between its image's build and
 * its first container), so the command is run only when none is in progress anywhere on the host — the README and
 * the task's Design say so; a lock the runner holds would close the gap.
 */
export async function imagesCommand(
  argv: readonly string[],
  io: Io,
  port: ImagePort = dockerImagesCli(systemProcess),
): Promise<number> {
  const [verb, ...rest] = argv;
  const dryRun = rest.length === 1 && rest[0] === '--dry-run';
  if (verb !== 'prune' || (rest.length > 0 && !dryRun)) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  let images: ImageInfo[];
  let containers: ContainerInfo[];
  try {
    [images, containers] = await Promise.all([port.list(), port.containers()]);
  } catch (error) {
    return report([{ path: 'images', message: reasonOf(error) }], io);
  }
  const running = containers.find(
    (container) => container.running && container.name.startsWith(BENCHMARK_CONTAINER),
  );
  if (running !== undefined) {
    return report(
      [
        {
          path: 'images',
          message: `not pruned: the benchmark container ${running.name} is running; a run in progress needs its image`,
        },
      ],
      io,
    );
  }
  const { remove, kept } = pruneCandidates(images, containers, scoringImage().tag);
  let removed = 0;
  let failed = 0;
  for (const image of remove) {
    if (dryRun) {
      io.stdout(`would remove ${image.reference} (${image.size})\n`);
      continue;
    }
    try {
      await port.remove(image.reference);
      removed += 1;
      io.stdout(`removed ${image.reference} (${image.size})\n`);
    } catch (error) {
      failed += 1;
      io.stderr(`${image.reference}: ${reasonOf(error)}\n`);
    }
  }
  for (const { image, reason } of kept) io.stdout(`kept ${image.reference} (${reason})\n`);
  io.stdout(
    dryRun ? `would remove ${count(remove.length, 'image')}\n` : `removed ${count(removed, 'image')}\n`,
  );
  return failed > 0 ? EXIT.failure : EXIT.ok;
}
