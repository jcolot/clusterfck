import * as distances from "./distance.js";

class HierarchicalClustering {
  constructor(distance, linkage, threshold = Infinity) {
    this.distance = distance;
    this.linkage = linkage;
    this.threshold = threshold;
    this.clusters = [];
    this.dists = []; // distances between each pair of clusters
    this.mins = []; // closest cluster for each cluster
    this.index = []; // keep a hash of all clusters by key
  }

  cluster(items, snapshotPeriod, snapshotCb) {
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
            : this.distance(this.clusters[i].value, this.clusters[j].value);
        this.dists[i][j] = dist;
        this.dists[j][i] = dist;

        if (dist < this.dists[i][this.mins[i]]) {
          this.mins[i] = j;
        }
      }
    }

    let merged = this.mergeClosest();
    let i = 0;
    while (merged) {
      if (snapshotCb && i++ % snapshotPeriod === 0) {
        snapshotCb(this.clusters);
      }
      merged = this.mergeClosest();
    }

    this.clusters.forEach((cluster) => {
      // clean up metadata used for clustering
      delete cluster.key;
      delete cluster.index;
    });

    return this.clusters;
  }

  mergeClosest() {
    // find two closest clusters from cached mins
    let minKey = 0,
      min = Infinity;
    for (let i = 0; i < this.clusters.length; i++) {
      const key = this.clusters[i].key,
        dist = this.dists[key][this.mins[key]];
      if (dist < min) {
        minKey = key;
        min = dist;
      }
    }
    if (min >= this.threshold) {
      return false;
    }

    const c1 = this.index[minKey],
      c2 = this.index[this.mins[minKey]];

    // merge two closest clusters
    const merged = {
      left: c1,
      right: c2,
      key: c1.key,
      size: c1.size + c2.size,
    };

    this.clusters[c1.index] = merged;
    this.clusters.splice(c2.index, 1);
    this.index[c1.key] = merged;

    // update distances with new merged cluster
    for (let i = 0; i < this.clusters.length; i++) {
      const ci = this.clusters[i];
      let dist;
      if (c1.key === ci.key) {
        dist = Infinity;
      } else if (this.linkage === "single") {
        dist = this.dists[c1.key][ci.key];
        if (this.dists[c1.key][ci.key] > this.dists[c2.key][ci.key]) {
          dist = this.dists[c2.key][ci.key];
        }
      } else if (this.linkage === "complete") {
            dist = this.dists[c1.key][ci.key];
            if (this.dists[c1.key][ci.key] < this.dists[c2.key][ci.key]) {
               dist = this.dists[c2.key][ci.key];              
            }
      }
        else if (this.linkage == "average") {
            dist = (this.dists[c1.key][ci.key] * c1.size
                   + this.dists[c2.key][ci.key] * c2.size) / (c1.size + c2.size);
         }
      else {
            dist = this.distance(ci.value, c1.value);            
      }

         this.dists[c1.key][ci.key] = this.dists[ci.key][c1.key] = dist;
      }

    
      // update cached mins
      for (let i = 0; i < this.clusters.length; i++) {
         const key1 = this.clusters[i].key;        
         if (this.mins[key1] == c1.key || this.mins[key1] == c2.key) {
            const min = key1;
            for (let j = 0; j < this.clusters.length; j++) {
               const key2 = this.clusters[j].key;
               if (this.dists[key1][key2] < this.dists[key1][min]) {
                  min = key2;                  
               }
            }
            this.mins[key1] = min;
         }
         this.clusters[i].index = i;
      }
    
      // clean up metadata used for clustering
      delete c1.key; delete c2.key;
      delete c1.index; delete c2.index;

      return true;
   }
}


const hcluster = (
  items,
  distance = 'euclidean',
  linkage = 'average',
  threshold,
  snapshot,
  snapshotCallback
) => {
  if (typeof distance === 'string') {
    distance = distances[distance];
  }

  const clusters = new HierarchicalClustering(distance, linkage, threshold).cluster(
    items,
    snapshot,
    snapshotCallback
  );

  if (typeof threshold === 'undefined') {
    return clusters[0]; // all clustered into one
  }

  return clusters;
};


export { HierachicalClustering, hcluster };