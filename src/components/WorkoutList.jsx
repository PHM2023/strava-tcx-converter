import React from 'react';
import './WorkoutList.css';

function WorkoutList({ activities, onDownloadActivity }) {
  return (
    <div id="workouts-list">
      {activities.map(activity => (
        <div key={activity.id} className="workout-card">
          <h4>{activity.name}</h4>
          <p>Type: {activity.type}</p>
          <p>Distance: {(activity.distance / 1000).toFixed(2)} km</p>
          <p>Date: {new Date(activity.start_date).toLocaleDateString()}</p>
          <button 
            onClick={() => onDownloadActivity(activity.id, activity.name)}
            className="download-button"
          >
            Download Activity
          </button>
        </div>
      ))}
    </div>
  );
}

export default WorkoutList; 