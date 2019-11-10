import './styles.scss';

interface story {
  by: string;
  descendants: number;
  id: number;
  score: number;
  time: number;
  title: string;
  type: 'story';
  url: string;
}

(async () => {
  const API_URL = 'https://hacker-news.firebaseio.com/v0';
  const STORIES_TO_FETCH = 10;

  let firstIndexToRender = 0;
  let lastIndexToRender = -1; // counteract for first fetch

  const processedIndexes: number[] = [];
  const processedStories: story[] = [];
  const workingIndexSet = new Set<number>();
  let renderQueue: number[] = [];
  const list = document.querySelectorAll('.list')[0];

  // fetches an array of new stories. called once on app load
  const fetchAllNewStories = async () => {
    const response = await fetch(`${API_URL}/newstories.json`);
    const parsed = (await response.json()) as Promise<number[]>;
    return parsed;
  };

  // fetches a single story
  const fetchStory = async (item: number) => {
    const response = await fetch(`${API_URL}/item/${item}.json`);
    const parsed = (await response.json()) as Promise<story>;
    return parsed;
  };

  const fetchNextBatch = () => {
    // return if there are any in the workingIndexSet
    if (workingIndexSet.size) {
      return;
    }

    lastIndexToRender += STORIES_TO_FETCH;

    console.log('first and last', firstIndexToRender, lastIndexToRender);

    // add n=STORIES_TO_FETCH indexes to the working set
    for (let i = firstIndexToRender; i <= lastIndexToRender; i++) {
      workingIndexSet.add(i);
    }

    // add them to the processed stories array
    workingIndexSet.forEach(async storyIndex => {
      processedStories[storyIndex] = await fetchStory(newStoryIDs[storyIndex]);
      // when it's done fetching, add to the pipeline
      addToBatchPipeline(storyIndex);
    });
  };

  // batch by network response, sort and push to render queue
  const addToBatchPipeline = (index: number) => {
    const currentBatch: number[] = [];

    processedIndexes.push(index);

    let i = firstIndexToRender;

    for (; i <= lastIndexToRender; i++) {
      if (processedIndexes.includes(i)) {
        currentBatch.push(i);
        workingIndexSet.delete(i);
      } else {
        break;
      }
    }

    firstIndexToRender = i;

    if (currentBatch.length) {
      pushToRenderQueue(currentBatch);
    }
  };

  // batch by frames and render
  const pushToRenderQueue = async (currentBatch: number[]) => {
    renderQueue.push(...currentBatch);
    await new Promise(requestAnimationFrame);

    if (renderQueue.length === 0) {
      return;
    }

    console.log(currentBatch);
    render();
  };

  // batch by DOM nodes and append to DOM
  const render = async () => {
    const fragment = new DocumentFragment();

    renderQueue.forEach(index => {
      const item: story = processedStories[index];
      const x = document
        .createRange()
        .createContextualFragment(
          `<div class="list-item">${index + 1}. ${item.title}</div>`,
        );

      fragment.append(x);
    });

    list.append(fragment);

    renderQueue = [];

    return true;
  };

  // START
  const newStoryIDs = await fetchAllNewStories();

  const btn = document.getElementById('more');
  btn.addEventListener('click', fetchNextBatch);

  fetchNextBatch();
})();
