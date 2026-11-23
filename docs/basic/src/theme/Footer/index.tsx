import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <Link to='/' className={styles.brand} aria-label='Fluentic Style home'>
            <img src={useBaseUrl('/img/logo.png')} width='32' height='32' alt='' />
            <span>fluentic/style</span>
          </Link>
          <span className={styles.copyright}>© {new Date().getFullYear()} Fluentic</span>
        </div>
        <nav className={styles.links} aria-label='Footer navigation'>
          <span className={styles.license}>MIT licensed</span>
          <Link to='/docs/quick-start'>Docs</Link>
          <a href='https://github.com/fluentic-dev/style' target='_blank' rel='noopener noreferrer'>
            GitHub <span aria-hidden='true'>↗</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
