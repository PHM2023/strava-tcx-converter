import React from 'react';
import './AthleteInfo.css';

function AthleteInfo({ athlete, activities, onDownloadActivity }) {
  return (
    <div className="athlete-info">
      <div className="athlete-header">
        <h2>{athlete.firstname} {athlete.lastname}'s Recent Activities</h2>
      </div>
      
      <div className="activities-container">
        {activities.map(activity => (
          <div key={activity.id} className="activity-card">
            <div className="activity-title">{activity.name}</div>
            <div className="activity-details">
              <div>Type: {activity.type}</div>
              <div>Distance: {(activity.distance / 1000).toFixed(2)} km</div>
              <div>Date: {new Date(activity.start_date).toLocaleDateString()}</div>
            </div>
            <button 
              onClick={() => onDownloadActivity(activity.id, activity.name)}
              className="download-button"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AthleteInfo; 