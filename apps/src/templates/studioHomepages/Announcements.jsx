import React, {PropTypes} from 'react';
import ContentContainer from '../ContentContainer';
import Announcement from './Announcement';
import AnnouncementsCarousel from './AnnouncementsCarousel';
import i18n from "@cdo/locale";

const Announcements = React.createClass({
  propTypes: {
    announcements: PropTypes.arrayOf(
      PropTypes.shape({
        heading: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        image: PropTypes.string,
        link: PropTypes.string.isRequired,
        buttonText: PropTypes.string.isRequired,
      })
    ),
    isRtl: PropTypes.bool.isRequired
  },

  render() {
    const { announcements, isRtl } = this.props;

    return (
      <div>
        <ContentContainer
          heading={i18n.announcements()}
          linkText={i18n.viewAllAnnouncements()}
          link="http://teacherblog.code.org/"
          isRtl={isRtl}
        >
          <AnnouncementsCarousel>
            {announcements.map((announcement, index) =>
              <Announcement
                key={index}
                heading={announcement.heading}
                description={announcement.description}
                buttonText={announcement.buttonText}
                link={announcement.link}
                image={announcement.image}
                isRtl={isRtl}
              />
             )}
          </AnnouncementsCarousel>
        </ContentContainer>
      </div>
    );
  }
});

export default Announcements;
