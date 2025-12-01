
import { TableData, AnimationStyle, Theme, AnimationConfig, Layout } from './types';

export const DEFAULT_TABLE_DATA: TableData = {
  title: "महादेश र तिनका विशेषताहरू (Continents & Features)",
  columns: ["महादेश", "मा भएका देश संख्या", "को ठूलो देश", "को सानो देश", "को ठूलो पर्वतमाला", "को ठूलो मरुभूमि", "को भू-भाग (%)"],
  data: [
    ["एसिया", "४८", "चिन", "माल्दिभ्स", "हिमालय", "अरेवियन", "२९.९२"],
    ["अफ्रिका", "५४", "अल्जेरिया", "सेसेल्स", "एटलास", "सहारा", "२०.२"],
    ["उ.अमेरिका", "२९", "क्यानडा", "सेन्ट किट्स", "रकि", "ग्रेट वेसिन", "१६.५"],
    ["द.अमेरिका", "१२", "ब्राजिल", "सुरिनाम", "एण्डीज", "पाटागोनिया", "१२"],
    ["अन्टार्कटिका", "-", "-", "-", "एल्सवर्थ", "एन्टार्कटिका", "९"],
    ["युरोप", "४४", "रसिया", "भ्याटिकन सिटी", "आल्पस", "-", "७"],
    ["अष्ट्रेलिया", "१३", "अष्ट्रेलिया", "नाउर", "Great Dividing", "Great Victoria", "५.३"]
  ]
};

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  style: AnimationStyle.FADE_UP,
  theme: Theme.COSMIC,
  layout: Layout.STACKED,
  rowDelay: 1.0, 
  highlightActive: true,
  showProgressBar: true,
  durationPerItem: 2.5, 
  showAppName: true,
  showAiWatermark: false,
};
