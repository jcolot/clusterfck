import distances from "./distance";

class HierarchicalClustering {
  constructor(distance, linkage, threshold = Infinity) {
    this.distance = distance;
    this.linkage = linkage;
    this.threshold = threshold;
    this.clusters = [];
    this.dists = [];
    this.mins = [];
    this.index = [];
  }

  cluster(items, snapshotPeriod, snapshotCb) {
    this.initializeClusters(items);

    let merged = this.mergeClosest();
    let i = 0;
    while (merged) {
      if (snapshotCb && i++ % snapshotPeriod === 0) {
        snapshotCb(this.clusters);
      }
      merged = this.mergeClosest();
    }

    this.cleanupMetadata();

    return this.clusters;
  }

  initializeClusters(items) {
    for (let i = 0; i < items.length; i++) {
      const cluster = {
        value: items[i],
        key: i,
        index: i,
        size: 1,
      };
      this.clusters[i] = cluster;
      this.index[i] = cluster;
      this.dists[i] = [];
      this.mins[i] = 0;
    }

    for (let i = 0; i < this.clusters.length; i++) {
      for (let j = 0; j <= i; j++) {
        const dist =
          i === j
            ? Infinity
            : this.distance(
                this.clusters[i].value,
                this.clusters[j].value
              );
        this.dists[i][j] = dist;
        this.dists[j][i] = dist;

        if (dist < this.dists[i][this.mins[i]]) {
          this.mins[i] = j;
        }
      }
    }
  }

  mergeClosest() {
    const minKey = this.getMinDistanceClusterKey();

    if (this.dists[minKey][this.mins[minKey]] >= this.threshold) {
      return false;
    }

    const c1 = this.index[minKey];
    const c2 = this.index[this.mins[minKey]];

    const merged = {
      left: c1,
      right: c2,
      key: c1.key,
      size: c1.size + c2.size,
    };

    this.clusters[c1.index] = merged;
    this.clusters.splice(c2.index, 1);
    this.index[c1.key] = merged;

    this.updateDistancesWithMergedCluster(c1, c2);

    this.updateCachedMins(c1, c2);

    this.cleanupMetadata(c1, c2);

    return true;
  }

  getMinDistanceClusterKey() {
    let minKey = 0;
    let min = Infinity;
    for (let i = 0; i < this.clusters.length; i++) {
      const key = this.clusters[i].key;
      const dist = this.dists[key][this.mins[key]];
      if (dist < min) {
        minKey = key;
        min = dist;
      }
    }
    return minKey;
  }

  updateDistancesWithMergedCluster(c1, c2) {
    for (let i = 0; i < this.clusters.length; i++) {
      const ci = this.clusters[i];
      let dist;
      if (c1.key === ci.key) {
        dist = Infinity;
      } else if (this.linkage === "single") {
        dist = this.dists[c1.key][ci.key];
        if (this.dists[c1.key][ci.key] >
