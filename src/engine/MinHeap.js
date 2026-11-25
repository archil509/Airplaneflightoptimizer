/**
 * Binary Min-Heap Priority Queue for shortest-path graph search.
 * Supports O(log V) push and extract-min operations.
 */
export class MinHeap {
  constructor(compareFn = (a, b) => a.priority - b.priority) {
    this.heap = [];
    this.compare = compareFn;
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  push(item) {
    this.heap.push(item);
    this.#bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.#sinkDown(0);
    return min;
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
        [this.heap[index], this.heap[parentIndex]] = [
          this.heap[parentIndex],
          this.heap[index],
        ];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  #sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      const left = (index << 1) + 1;
      const right = left + 1;
      let smallest = index;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}
