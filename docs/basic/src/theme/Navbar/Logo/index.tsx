import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function NavbarLogo() {
  return (
    <Link to='/' className={`navbar__brand ${styles.brand}`} aria-label='Fluentic Style home'>
      <img className={styles.mark} src={useBaseUrl('/img/logo.png')} width='40' height='40' alt='' />
      <span className={styles.wordmark} aria-hidden='true'>fluentic/style</span>
    </Link>
  );
}
